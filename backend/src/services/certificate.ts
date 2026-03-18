import PDFDocument from 'pdfkit'
import { PrismaClient } from '@prisma/client'
import { nanoid } from 'nanoid'
import { s3Service } from './s3'

export const certificateService = {
  async generate(resultId: string, prisma: PrismaClient) {
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        exam: { include: { organization: true } },
        attempt: { include: { candidate: true } }
      }
    })

    if (!result) throw new Error('Result not found')
    if (result.certificate) return result.certificate

    const candidate = result.attempt.candidate
    const exam = result.exam

    const verifyCode = nanoid(16).toUpperCase()
    const candidateName = `${candidate.firstName} ${candidate.lastName}`

    // Generate PDF
    const pdfBuffer = await generateCertificatePDF({
      candidateName,
      examTitle: exam.title,
      score: result.percentage,
      organization: exam.organization.name,
      issuedAt: new Date(),
      verifyCode
    })

    // Upload to S3
    const pdfKey = `certificates/${verifyCode}.pdf`
    const pdfUrl = await s3Service.uploadBuffer(pdfBuffer, pdfKey, 'application/pdf')

    // Save to DB
    const certificate = await prisma.certificate.create({
      data: {
        resultId,
        userId: candidate.id,
        organizationId: exam.organizationId,
        examTitle: exam.title,
        candidateName,
        score: result.percentage,
        grade: getGrade(result.percentage),
        issuedAt: new Date(),
        verifyCode,
        pdfUrl
      }
    })

    return certificate
  }
}

function getGrade(percentage: number): string {
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  return 'F'
}

async function generateCertificatePDF(data: {
  candidateName: string
  examTitle: string
  score: number
  organization: string
  issuedAt: Date
  verifyCode: string
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    })

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const width = doc.page.width
    const height = doc.page.height

    // Background
    doc.rect(0, 0, width, height).fill('#0b0b0b')

    // Gold border
    doc.rect(20, 20, width - 40, height - 40)
      .lineWidth(3)
      .stroke('#ff9900')

    // Inner border
    doc.rect(30, 30, width - 60, height - 60)
      .lineWidth(1)
      .stroke('#ff990066')

    // Header
    doc.fillColor('#ff9900')
      .fontSize(14)
      .text('EXAMHUB', 0, 60, { align: 'center', characterSpacing: 8 })

    doc.fillColor('#ffffff')
      .fontSize(32)
      .font('Helvetica-Bold')
      .text('Certificate of Achievement', 0, 90, { align: 'center' })

    // Divider
    doc.moveTo(150, 140).lineTo(width - 150, 140)
      .lineWidth(1)
      .stroke('#ff9900')

    // Body
    doc.fillColor('#aaaaaa')
      .fontSize(14)
      .font('Helvetica')
      .text('This certifies that', 0, 160, { align: 'center' })

    doc.fillColor('#ffffff')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text(data.candidateName, 0, 185, { align: 'center' })

    doc.fillColor('#aaaaaa')
      .fontSize(14)
      .font('Helvetica')
      .text('has successfully completed', 0, 225, { align: 'center' })

    doc.fillColor('#ff9900')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(data.examTitle, 0, 250, { align: 'center' })

    doc.fillColor('#aaaaaa')
      .fontSize(14)
      .font('Helvetica')
      .text(`with a score of ${data.score.toFixed(1)}%  •  Grade: ${getGrade(data.score)}`, 0, 285, { align: 'center' })

    doc.text(`Issued by ${data.organization}`, 0, 310, { align: 'center' })

    // Footer
    doc.moveTo(150, 350).lineTo(width - 150, 350)
      .lineWidth(0.5)
      .stroke('#444444')

    const dateStr = data.issuedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    doc.fillColor('#777777')
      .fontSize(10)
      .text(`Issued: ${dateStr}`, 80, 365)
      .text(`Verify at: examhub.io/verify/${data.verifyCode}`, 0, 365, { align: 'right', width: width - 160 })

    doc.fillColor('#555555')
      .fontSize(8)
      .text(`Certificate ID: ${data.verifyCode}`, 0, 380, { align: 'center' })

    doc.end()
  })
}
