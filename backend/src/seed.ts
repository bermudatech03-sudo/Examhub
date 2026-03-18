import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding ExamHub database...')

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      domain: 'demo.examhub.io',
      maxCandidates: 500,
      maxExams: 50,
      subscriptionTier: 'PRO',
      isActive: true,
    }
  })
  console.log('✅ Organization created:', org.name)

  // Create Super Admin
  const adminHash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@examhub.io' },
    update: {},
    create: {
      email: 'admin@examhub.io',
      passwordHash: adminHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    }
  })
  console.log('✅ Super Admin created:', admin.email)

  // Create Org Admin
  const orgAdminHash = await bcrypt.hash('admin123', 12)
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'orgadmin@examhub.io' },
    update: {},
    create: {
      email: 'orgadmin@examhub.io',
      passwordHash: orgAdminHash,
      firstName: 'Org',
      lastName: 'Admin',
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      organizationId: org.id,
    }
  })
  console.log('✅ Org Admin created:', orgAdmin.email)

  // Create Examiner
  const examinerHash = await bcrypt.hash('examiner123', 12)
  const examiner = await prisma.user.upsert({
    where: { email: 'examiner@examhub.io' },
    update: {},
    create: {
      email: 'examiner@examhub.io',
      passwordHash: examinerHash,
      firstName: 'Jane',
      lastName: 'Examiner',
      role: 'EXAMINER',
      status: 'ACTIVE',
      emailVerified: true,
      organizationId: org.id,
    }
  })
  console.log('✅ Examiner created:', examiner.email)

  // Create Candidate
  const studentHash = await bcrypt.hash('student123', 12)
  const student = await prisma.user.upsert({
    where: { email: 'student@examhub.io' },
    update: {},
    create: {
      email: 'student@examhub.io',
      passwordHash: studentHash,
      firstName: 'John',
      lastName: 'Student',
      role: 'CANDIDATE',
      status: 'ACTIVE',
      emailVerified: true,
      organizationId: org.id,
    }
  })
  console.log('✅ Candidate created:', student.email)

  // Create tags
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { name: 'JavaScript' }, update: {}, create: { name: 'JavaScript', color: '#f7df1e' } }),
    prisma.tag.upsert({ where: { name: 'Python' }, update: {}, create: { name: 'Python', color: '#3776ab' } }),
    prisma.tag.upsert({ where: { name: 'Data Structures' }, update: {}, create: { name: 'Data Structures', color: '#ff9900' } }),
    prisma.tag.upsert({ where: { name: 'Algorithms' }, update: {}, create: { name: 'Algorithms', color: '#00cc44' } }),
    prisma.tag.upsert({ where: { name: 'Web Dev' }, update: {}, create: { name: 'Web Dev', color: '#3399ff' } }),
  ])
  console.log('✅ Tags created:', tags.length)

  // Create sample questions
  const q1 = await prisma.question.create({
    data: {
      type: 'MULTIPLE_CHOICE',
      difficulty: 'EASY',
      title: 'JavaScript typeof operator',
      content: 'What does `typeof null` return in JavaScript?',
      explanation: 'Due to a historical bug in JavaScript, typeof null returns "object" instead of "null".',
      points: 1,
      isPublic: true,
      createdById: examiner.id,
      organizationId: org.id,
      options: {
        create: [
          { content: '"null"', isCorrect: false, orderIndex: 0 },
          { content: '"object"', isCorrect: true, orderIndex: 1 },
          { content: '"undefined"', isCorrect: false, orderIndex: 2 },
          { content: '"string"', isCorrect: false, orderIndex: 3 },
        ]
      }
    }
  })

  const q2 = await prisma.question.create({
    data: {
      type: 'MULTIPLE_CHOICE',
      difficulty: 'MEDIUM',
      title: 'Array time complexity',
      content: 'What is the average time complexity of inserting an element at the beginning of an array?',
      explanation: 'Inserting at the beginning requires shifting all existing elements by one position, making it O(n).',
      points: 2,
      isPublic: true,
      createdById: examiner.id,
      organizationId: org.id,
      options: {
        create: [
          { content: 'O(1)', isCorrect: false, orderIndex: 0 },
          { content: 'O(log n)', isCorrect: false, orderIndex: 1 },
          { content: 'O(n)', isCorrect: true, orderIndex: 2 },
          { content: 'O(n²)', isCorrect: false, orderIndex: 3 },
        ]
      }
    }
  })

  const q3 = await prisma.question.create({
    data: {
      type: 'TRUE_FALSE',
      difficulty: 'EASY',
      title: 'REST statelessness',
      content: 'REST APIs must be stateless, meaning each request must contain all the information needed to process it.',
      explanation: 'Statelessness is one of the core constraints of REST architecture.',
      points: 1,
      isPublic: true,
      createdById: examiner.id,
      organizationId: org.id,
      options: {
        create: [
          { content: 'True', isCorrect: true, orderIndex: 0 },
          { content: 'False', isCorrect: false, orderIndex: 1 },
        ]
      }
    }
  })

  const q4 = await prisma.question.create({
    data: {
      type: 'CODING',
      difficulty: 'MEDIUM',
      title: 'Two Sum',
      content: 'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to target.\n\nYou may assume that each input has exactly one solution.\n\nExample:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]',
      explanation: 'Use a hash map to store complement values for O(n) solution.',
      points: 5,
      isPublic: true,
      createdById: examiner.id,
      organizationId: org.id,
      codingProblem: {
        create: {
          languages: ['PYTHON', 'JAVASCRIPT'],
          boilerplate: {
            PYTHON: 'def two_sum(nums, target):\n    # Write your solution here\n    pass\n\n# Read input\nnums = list(map(int, input().split()))\ntarget = int(input())\nresult = two_sum(nums, target)\nprint(result[0], result[1])',
            JAVASCRIPT: 'const readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on("line", l => lines.push(l.trim()));\nrl.on("close", () => {\n  const nums = lines[0].split(" ").map(Number);\n  const target = Number(lines[1]);\n  \n  function twoSum(nums, target) {\n    // Write your solution here\n  }\n  \n  const [i, j] = twoSum(nums, target);\n  console.log(i, j);\n});'
          },
          testCases: [
            { input: '2 7 11 15\n9', expectedOutput: '0 1', isHidden: false },
            { input: '3 2 4\n6', expectedOutput: '1 2', isHidden: false },
            { input: '3 3\n6', expectedOutput: '0 1', isHidden: true },
          ],
          timeLimit: 5000,
          memoryLimit: 256
        }
      }
    }
  })

  const q5 = await prisma.question.create({
    data: {
      type: 'ESSAY',
      difficulty: 'HARD',
      title: 'Microservices vs Monolith',
      content: 'Compare and contrast microservices architecture with monolithic architecture. Include: advantages, disadvantages, and when to use each. Provide real-world examples.',
      explanation: 'monolith,microservices,scalability,deployment,complexity',
      points: 10,
      isPublic: true,
      createdById: examiner.id,
      organizationId: org.id,
    }
  })

  console.log('✅ Questions created:', 5)

  // Create a demo exam
  const exam = await prisma.exam.create({
    data: {
      title: 'Full-Stack Developer Assessment',
      description: 'A comprehensive assessment covering JavaScript, data structures, REST APIs, and system design.',
      instructions: 'Answer all questions. For coding questions, ensure your solution handles all edge cases. You have 90 minutes.',
      status: 'PUBLISHED',
      duration: 90,
      totalPoints: 19,
      passingScore: 70,
      maxAttempts: 2,
      shuffleQuestions: false,
      shuffleOptions: true,
      showResults: true,
      showCorrectAnswers: false,
      isProctored: true,
      allowBacktrack: true,
      category: 'Programming',
      tags: ['JavaScript', 'Web Dev', 'Algorithms'],
      createdById: examiner.id,
      organizationId: org.id,
      questions: {
        create: [
          { questionId: q1.id, orderIndex: 0 },
          { questionId: q2.id, orderIndex: 1 },
          { questionId: q3.id, orderIndex: 2 },
          { questionId: q4.id, orderIndex: 3 },
          { questionId: q5.id, orderIndex: 4 },
        ]
      }
    }
  })
  console.log('✅ Demo exam created:', exam.title)

  // System settings
  await prisma.systemSetting.upsert({
    where: { key: 'platform_name' },
    update: {},
    create: { key: 'platform_name', value: '"ExamHub"', isPublic: true }
  })

  await prisma.systemSetting.upsert({
    where: { key: 'max_violation_count' },
    update: {},
    create: { key: 'max_violation_count', value: '3', isPublic: false }
  })

  console.log('\n✅ Database seeded successfully!')
  console.log('\n📋 Demo Credentials:')
  console.log('   Super Admin: admin@examhub.io / admin123')
  console.log('   Org Admin:   orgadmin@examhub.io / admin123')
  console.log('   Examiner:    examiner@examhub.io / examiner123')
  console.log('   Candidate:   student@examhub.io / student123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
