import Docker from 'dockerode'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const docker = new Docker({ socketPath: '/var/run/docker.sock' })

const LANGUAGE_IMAGES: Record<string, string> = {
  PYTHON: 'python:3.12-alpine',
  JAVA: 'openjdk:21-alpine',
  CPP: 'gcc:13-alpine',
  JAVASCRIPT: 'node:20-alpine'
}

const LANGUAGE_COMMANDS: Record<string, (file: string) => string[]> = {
  PYTHON: (file) => ['python3', file],
  JAVA: (file) => ['sh', '-c', `cd /app && javac ${file}.java && java ${file}`],
  CPP: (file) => ['sh', '-c', `g++ -o /app/solution /app/${file} && /app/solution`],
  JAVASCRIPT: (file) => ['node', file]
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  PYTHON: 'py',
  JAVA: 'java',
  CPP: 'cpp',
  JAVASCRIPT: 'js'
}

export interface ExecutionResult {
  status: string
  output: string | null
  executionTime: number | null
  memoryUsed: number | null
  testResults: Array<{ input: string; expectedOutput: string; actualOutput: string; passed: boolean }>
  error: string | null
}

export const codeExecutionService = {
  async execute(
    input: {
      attemptId: string
      questionId: string
      language: string
      code: string
    },
    prisma: PrismaClient
  ): Promise<ExecutionResult> {
    const question = await prisma.question.findUnique({
      where: { id: input.questionId },
      include: { codingProblem: true }
    })

    if (!question?.codingProblem) {
      throw new Error('Not a coding question')
    }

    const problem = question.codingProblem
    const testCases = problem.testCases as Array<{
      input: string
      expectedOutput: string
      isHidden: boolean
    }>

    const testResults: ExecutionResult['testResults'] = []
    let allPassed = true
    const startTime = Date.now()

    for (const tc of testCases) {
      const result = await this.runCode({
        code: input.code,
        language: input.language,
        stdin: tc.input,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit
      })

      const actualOutput = result.output?.trim() || ''
      const expectedOutput = tc.expectedOutput.trim()
      const passed = actualOutput === expectedOutput

      if (!passed) allPassed = false

      testResults.push({
        input: tc.isHidden ? '[hidden]' : tc.input,
        expectedOutput: tc.isHidden ? '[hidden]' : expectedOutput,
        actualOutput: tc.isHidden ? (passed ? 'Correct' : 'Wrong') : actualOutput,
        passed
      })

      if (result.error && result.status !== 'WRONG_ANSWER') {
        // Stop on runtime/compile error
        break
      }
    }

    const executionTime = Date.now() - startTime
    const finalStatus = allPassed ? 'ACCEPTED' : 'WRONG_ANSWER'

    // Save submission to DB
    const answer = await prisma.answer.findUnique({
      where: {
        attemptId_questionId: {
          attemptId: input.attemptId,
          questionId: input.questionId
        }
      }
    })

    if (answer) {
      await prisma.codingSubmission.upsert({
        where: { answerId: answer.id },
        update: {
          language: input.language as any,
          code: input.code,
          status: finalStatus as any,
          executionTime,
          testResults: testResults as any,
          evaluatedAt: new Date()
        },
        create: {
          answerId: answer.id,
          language: input.language as any,
          code: input.code,
          status: finalStatus as any,
          executionTime,
          testResults: testResults as any,
          evaluatedAt: new Date()
        }
      })
    }

    return {
      status: finalStatus,
      output: null,
      executionTime,
      memoryUsed: null,
      testResults,
      error: null
    }
  },

  async runCode(params: {
    code: string
    language: string
    stdin: string
    timeLimit: number
    memoryLimit: number
  }): Promise<{ output: string | null; status: string; error: string | null }> {
    const image = LANGUAGE_IMAGES[params.language]
    if (!image) throw new Error(`Unsupported language: ${params.language}`)

    const ext = LANGUAGE_EXTENSIONS[params.language]
    const containerName = `examhub-exec-${randomUUID()}`

    try {
      // Create temp container
      const container = await docker.createContainer({
        Image: image,
        name: containerName,
        Cmd: ['sleep', '60'],
        HostConfig: {
          Memory: params.memoryLimit * 1024 * 1024, // bytes
          CpuQuota: 50000, // 50% CPU
          NetworkMode: 'none', // No network access
          ReadonlyRootfs: false,
          AutoRemove: true
        },
        WorkingDir: '/app'
      })

      await container.start()

      // Write code to container
      const fileName = params.language === 'JAVA' ? 'Solution' : 'solution'
      const fullFileName = `${fileName}.${ext}`

      const writeExec = await container.exec({
        Cmd: ['sh', '-c', `mkdir -p /app && cat > /app/${fullFileName}`],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true
      })

      const writeStream = await writeExec.start({ hijack: true, stdin: true })
      writeStream.write(params.code)
      writeStream.end()

      await new Promise(r => setTimeout(r, 500))

      // Execute with stdin
      const runCmd = LANGUAGE_COMMANDS[params.language](
        params.language === 'JAVA' ? 'Solution' : fullFileName
      )

      const exec = await container.exec({
        Cmd: runCmd,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true
      })

      let output = ''
      let error = ''

      const stream = await exec.start({ hijack: true, stdin: true })
      stream.write(params.stdin)
      stream.end()

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve()
          output = ''
          error = 'Time limit exceeded'
        }, params.timeLimit)

        stream.on('data', (chunk: Buffer) => {
          output += chunk.toString()
        })
        stream.on('error', (chunk: Buffer) => {
          error += chunk.toString()
        })
        stream.on('end', () => {
          clearTimeout(timeout)
          resolve()
        })
      })

      await container.stop({ t: 0 }).catch(() => {})

      if (error && error.includes('Time limit')) {
        return { output: null, status: 'TIME_LIMIT_EXCEEDED', error }
      }

      if (error && !output) {
        return {
          output: null,
          status: error.toLowerCase().includes('error') ? 'RUNTIME_ERROR' : 'COMPILATION_ERROR',
          error
        }
      }

      return { output: output.trim(), status: 'OK', error: null }
    } catch (err: any) {
      // Cleanup
      try {
        const c = docker.getContainer(containerName)
        await c.stop({ t: 0 }).catch(() => {})
        await c.remove().catch(() => {})
      } catch {}

      return {
        output: null,
        status: 'RUNTIME_ERROR',
        error: err.message || 'Execution failed'
      }
    }
  }
}
