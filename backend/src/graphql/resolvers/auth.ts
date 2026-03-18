import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { GraphQLContext, requireAuth } from '../../middleware/context'
import { emailService } from '../../services/email'
import { securityLogger } from '../../services/security-logger'

export const authResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx)
      return ctx.prisma.user.findUnique({
        where: { id: ctx.userId! },
        include: { organization: true }
      })
    }
  },

  Mutation: {
    register: async (
      _: unknown,
      { input }: { input: {
        email: string
        password: string
        firstName: string
        lastName: string
        organizationId?: string
        role?: string
      }},
      ctx: GraphQLContext
    ) => {
      // Check for existing user
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() }
      })
      if (existing) throw new Error('Email already registered')

      const passwordHash = await bcrypt.hash(input.password, 12)
      const verifyToken = nanoid(32)

      const user = await ctx.prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: (input.role as any) || 'CANDIDATE',
          status: 'PENDING_VERIFICATION',
          organizationId: input.organizationId || null,
          verifyToken,
          emailVerified: false
        },
        include: { organization: true }
      })

      // Send verification email
      await emailService.sendVerificationEmail(user.email, verifyToken)

      // Log security event
      await securityLogger.log({
        userId: user.id,
        action: 'USER_REGISTERED',
        ipAddress: ctx.request.ip,
        userAgent: ctx.request.headers['user-agent']
      }, ctx.prisma)

      const token = ctx.request.server.jwt.sign({
        sub: user.id,
        role: user.role,
        orgId: user.organizationId
      })

      return { token, user }
    },

    login: async (
      _: unknown,
      { input }: { input: { email: string; password: string }},
      ctx: GraphQLContext
    ) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
        include: { organization: true }
      })

      if (!user) throw new Error('Invalid credentials')
      if (user.status === 'SUSPENDED') throw new Error('Account suspended')
      if (user.status === 'INACTIVE') throw new Error('Account inactive')

      const valid = await bcrypt.compare(input.password, user.passwordHash)
      if (!valid) {
        await securityLogger.log({
          userId: user.id,
          action: 'LOGIN_FAILED',
          ipAddress: ctx.request.ip,
          userAgent: ctx.request.headers['user-agent']
        }, ctx.prisma)
        throw new Error('Invalid credentials')
      }

      // Update last login
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })

      await securityLogger.log({
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        ipAddress: ctx.request.ip,
        userAgent: ctx.request.headers['user-agent']
      }, ctx.prisma)

      const token = ctx.request.server.jwt.sign({
        sub: user.id,
        role: user.role,
        orgId: user.organizationId
      })

      return { token, user }
    },

    logout: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx)
      // Invalidate token via Redis blacklist
      const token = ctx.request.headers.authorization?.slice(7)
      if (token) {
        await ctx.redis.setex(`blacklist:${token}`, 86400, '1')
      }
      return true
    },

    verifyEmail: async (
      _: unknown,
      { token }: { token: string },
      ctx: GraphQLContext
    ) => {
      const user = await ctx.prisma.user.findFirst({
        where: { verifyToken: token }
      })
      if (!user) throw new Error('Invalid verification token')

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verifyToken: null,
          status: 'ACTIVE'
        }
      })

      return true
    },

    forgotPassword: async (
      _: unknown,
      { email }: { email: string },
      ctx: GraphQLContext
    ) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (!user) return true // Silent fail for security

      const resetToken = nanoid(32)
      const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry }
      })

      await emailService.sendPasswordResetEmail(user.email, resetToken)
      return true
    },

    resetPassword: async (
      _: unknown,
      { token, password }: { token: string; password: string },
      ctx: GraphQLContext
    ) => {
      const user = await ctx.prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: new Date() }
        }
      })

      if (!user) throw new Error('Invalid or expired reset token')

      const passwordHash = await bcrypt.hash(password, 12)

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpiry: null
        }
      })

      return true
    },

    refreshToken: async (
      _: unknown,
      { token: _token }: { token: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx)
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId! },
        include: { organization: true }
      })
      if (!user) throw new Error('User not found')

      const token = ctx.request.server.jwt.sign({
        sub: user.id,
        role: user.role,
        orgId: user.organizationId
      })

      return { token, user }
    }
  },

  User: {
    fullName: (user: { firstName: string; lastName: string }) =>
      `${user.firstName} ${user.lastName}`
  }
}
