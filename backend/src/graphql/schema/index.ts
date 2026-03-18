export const schema = `
  scalar DateTime
  scalar JSON
  scalar Upload

  # ============================================================
  # ENUMS
  # ============================================================

  enum UserRole {
    SUPER_ADMIN
    ORG_ADMIN
    EXAMINER
    CANDIDATE
  }

  enum UserStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
    PENDING_VERIFICATION
  }

  enum QuestionType {
    MULTIPLE_CHOICE
    TRUE_FALSE
    SHORT_ANSWER
    ESSAY
    CODING
    FILE_UPLOAD
  }

  enum DifficultyLevel {
    EASY
    MEDIUM
    HARD
    EXPERT
  }

  enum ExamStatus {
    DRAFT
    PUBLISHED
    ACTIVE
    PAUSED
    COMPLETED
    ARCHIVED
  }

  enum AttemptStatus {
    NOT_STARTED
    IN_PROGRESS
    SUBMITTED
    EVALUATED
    DISQUALIFIED
  }

  enum CheatingViolationType {
    TAB_SWITCH
    FULLSCREEN_EXIT
    RIGHT_CLICK
    COPY_PASTE
    KEYBOARD_SHORTCUT
    FACE_NOT_DETECTED
    MULTIPLE_FACES
    SUSPICIOUS_AUDIO
  }

  enum CodingLanguage {
    PYTHON
    JAVA
    CPP
    JAVASCRIPT
  }

  enum SubmissionStatus {
    PENDING
    RUNNING
    ACCEPTED
    WRONG_ANSWER
    TIME_LIMIT_EXCEEDED
    MEMORY_LIMIT_EXCEEDED
    RUNTIME_ERROR
    COMPILATION_ERROR
  }

  enum ResultStatus {
    PASS
    FAIL
    PENDING
  }

  # ============================================================
  # TYPES
  # ============================================================

  type Organization {
    id: ID!
    name: String!
    slug: String!
    domain: String
    logoUrl: String
    primaryColor: String!
    maxCandidates: Int!
    maxExams: Int!
    subscriptionTier: String!
    subscriptionEndsAt: DateTime
    isActive: Boolean!
    settings: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
    userCount: Int
    examCount: Int
  }

  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    fullName: String!
    avatarUrl: String
    role: UserRole!
    status: UserStatus!
    organizationId: String
    organization: Organization
    emailVerified: Boolean!
    lastLoginAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AuthPayload {
    token: String!
    refreshToken: String
    user: User!
  }

  type Tag {
    id: ID!
    name: String!
    color: String!
  }

  type QuestionOption {
    id: ID!
    content: String!
    isCorrect: Boolean
    orderIndex: Int!
  }

  type CodingProblem {
    id: ID!
    languages: [CodingLanguage!]!
    boilerplate: JSON!
    testCases: JSON!
    timeLimit: Int!
    memoryLimit: Int!
  }

  type Question {
    id: ID!
    type: QuestionType!
    difficulty: DifficultyLevel!
    subject: String
    title: String!
    content: String!
    explanation: String
    points: Float!
    timeLimit: Int
    isPublic: Boolean!
    isActive: Boolean!
    tags: [Tag!]!
    options: [QuestionOption!]
    codingProblem: CodingProblem
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ExamQuestion {
    id: ID!
    question: Question!
    orderIndex: Int!
    points: Float
  }

  type Exam {
    id: ID!
    title: String!
    description: String
    instructions: String
    status: ExamStatus!
    duration: Int!
    totalPoints: Float!
    passingScore: Float!
    maxAttempts: Int!
    shuffleQuestions: Boolean!
    shuffleOptions: Boolean!
    showResults: Boolean!
    showCorrectAnswers: Boolean!
    isProctored: Boolean!
    allowBacktrack: Boolean!
    startsAt: DateTime
    endsAt: DateTime
    accessCode: String
    thumbnailUrl: String
    category: String
    tags: [String!]!
    questions: [ExamQuestion!]!
    attemptCount: Int
    createdBy: User!
    organization: Organization!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ExamAttempt {
    id: ID!
    exam: Exam!
    candidate: User!
    status: AttemptStatus!
    startedAt: DateTime
    submittedAt: DateTime
    timeSpent: Int
    violationCount: Int!
    isDisqualified: Boolean!
    disqualifyReason: String
    createdAt: DateTime!
    answers: [Answer!]!        # ← ADD THIS
    cheatingLogs: [CheatingLog!]!
  }

  type Answer {
    id: ID!
    questionId: String!
    selectedOptions: [String!]!
    textAnswer: String
    isCorrect: Boolean
    pointsAwarded: Float!
    timeSpent: Int
    flagged: Boolean!
  }

  type CodingSubmission {
    id: ID!
    language: CodingLanguage!
    code: String!
    status: SubmissionStatus!
    executionTime: Int
    memoryUsed: Int
    testResults: JSON!
    errorMessage: String
  }

  type Result {
    id: ID!
    exam: Exam!
    candidate: User!
    totalPoints: Float!
    earnedPoints: Float!
    percentage: Float!
    status: ResultStatus!
    rank: Int
    percentile: Float
    timeTaken: Int
    gradedAt: DateTime
    feedback: String
    isPublished: Boolean!
    certificate: Certificate
    createdAt: DateTime!
    attempt: ExamAttempt 
  }

  type Certificate {
    id: ID!
    examTitle: String!
    candidateName: String!
    score: Float!
    grade: String
    issuedAt: DateTime!
    expiresAt: DateTime
    verifyCode: String!
    pdfUrl: String
  }

  type CheatingLog {
    id: ID!
    type: CheatingViolationType!
    description: String
    timestamp: DateTime!
  }

  type Notification {
    id: ID!
    type: String!
    title: String!
    body: String!
    isRead: Boolean!
    createdAt: DateTime!
  }

  type ExamStats {
    totalAttempts: Int!
    avgScore: Float!
    passRate: Float!
    avgTimeTaken: Int!
    scoreDistribution: JSON!
  }

  type DashboardStats {
    totalExams: Int!
    totalCandidates: Int!
    totalAttempts: Int!
    avgPassRate: Float!
    recentActivity: [JSON!]!
  }

  type CodeExecutionResult {
    status: SubmissionStatus!
    output: String
    executionTime: Int
    memoryUsed: Int
    testResults: JSON!
    error: String
  }

  type PaginatedQuestions {
    items: [Question!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }

  type PaginatedExams {
    items: [Exam!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }

  type PaginatedResults {
    items: [Result!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }

  type PaginatedUsers {
    items: [User!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }

  # ============================================================
  # INPUTS
  # ============================================================

  input RegisterInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    organizationId: String
    role: UserRole
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateOrganizationInput {
    name: String!
    slug: String!
    domain: String
    maxCandidates: Int
    maxExams: Int
    subscriptionTier: String
  }

  input UpdateOrganizationInput {
    name: String
    domain: String
    logoUrl: String
    primaryColor: String
    maxCandidates: Int
    maxExams: Int
    settings: JSON
  }

  input CreateQuestionInput {
    type: QuestionType!
    difficulty: DifficultyLevel
    subject: String
    title: String!
    content: String!
    explanation: String
    points: Float
    timeLimit: Int
    isPublic: Boolean
    tagIds: [String!]
    options: [QuestionOptionInput!]
    codingProblem: CodingProblemInput
  }

  input QuestionOptionInput {
    content: String!
    isCorrect: Boolean!
    orderIndex: Int
  }

  input CodingProblemInput {
    languages: [CodingLanguage!]!
    boilerplate: JSON
    testCases: JSON!
    timeLimit: Int
    memoryLimit: Int
  }

  input CreateExamInput {
    title: String!
    description: String
    instructions: String
    duration: Int!
    passingScore: Float
    maxAttempts: Int
    shuffleQuestions: Boolean
    shuffleOptions: Boolean
    showResults: Boolean
    showCorrectAnswers: Boolean
    isProctored: Boolean
    allowBacktrack: Boolean
    startsAt: DateTime
    endsAt: DateTime
    accessCode: String
    category: String
    tags: [String!]
    questionIds: [String!]
  }

  input UpdateExamInput {
    title: String
    description: String
    instructions: String
    duration: Int
    passingScore: Float
    status: ExamStatus
    maxAttempts: Int
    shuffleQuestions: Boolean
    shuffleOptions: Boolean
    showResults: Boolean
    showCorrectAnswers: Boolean
    isProctored: Boolean
    allowBacktrack: Boolean
    startsAt: DateTime
    endsAt: DateTime
    accessCode: String
    category: String
    tags: [String!]
  }

  input SubmitAnswerInput {
    attemptId: String!
    questionId: String!
    selectedOptions: [String!]
    textAnswer: String
    timeSpent: Int
    flagged: Boolean
  }

  input ExecuteCodeInput {
    attemptId: String!
    questionId: String!
    language: CodingLanguage!
    code: String!
  }

  input LogViolationInput {
    attemptId: String!
    type: CheatingViolationType!
    description: String
    metadata: JSON
  }

  input PaginationInput {
    page: Int
    pageSize: Int
    search: String
    sortBy: String
    sortOrder: String
  }

  input QuestionFilterInput {
    type: QuestionType
    difficulty: DifficultyLevel
    subject: String
    tagIds: [String!]
    isPublic: Boolean
  }

  input ExamFilterInput {
    status: ExamStatus
    category: String
    organizationId: String
  }

  # ============================================================
  # QUERIES
  # ============================================================

  type Query {
    # Auth
    me: User

    # Organizations
    organizations(pagination: PaginationInput): [Organization!]!
    organization(id: ID!): Organization
    myOrganization: Organization

    # Users
    users(organizationId: String, pagination: PaginationInput): PaginatedUsers!
    user(id: ID!): User

    # Questions
    questions(
      filter: QuestionFilterInput
      pagination: PaginationInput
    ): PaginatedQuestions!
    question(id: ID!): Question

    # Exams
    exams(
      filter: ExamFilterInput
      pagination: PaginationInput
    ): PaginatedExams!
    exam(id: ID!): Exam
    myExams(pagination: PaginationInput): PaginatedExams!
    availableExams: [Exam!]!

    # Attempts
    myAttempts: [ExamAttempt!]!
    attempt(id: ID!): ExamAttempt
    examAttempts(examId: String!): [ExamAttempt!]!
    activeAttempt(examId: String!): ExamAttempt

    # Results
    myResults(pagination: PaginationInput): PaginatedResults!
    result(id: ID!): Result
    examResults(examId: String!): PaginatedResults!
    examStats(examId: String!): ExamStats!

    # Dashboard
    dashboardStats: DashboardStats!

    # Certificates
    myCertificates: [Certificate!]!
    verifyCertificate(code: String!): Certificate

    # Notifications
    myNotifications(unreadOnly: Boolean): [Notification!]!
    unreadCount: Int!

    # Tags
    tags: [Tag!]!
  }

  # ============================================================
  # MUTATIONS
  # ============================================================

  type Mutation {
    # Auth
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!
    verifyEmail(token: String!): Boolean!
    forgotPassword(email: String!): Boolean!
    resetPassword(token: String!, password: String!): Boolean!
    refreshToken(token: String!): AuthPayload!

    # Organizations
    createOrganization(input: CreateOrganizationInput!): Organization!
    updateOrganization(id: ID!, input: UpdateOrganizationInput!): Organization!
    deactivateOrganization(id: ID!): Organization!

    # Users
    updateProfile(firstName: String, lastName: String, avatarUrl: String): User!
    updateUserRole(userId: ID!, role: UserRole!): User!
    updateUserStatus(userId: ID!, status: UserStatus!): User!
    inviteUser(email: String!, role: UserRole!): Boolean!
    deleteUser(userId: ID!): Boolean!

    # Questions
    createQuestion(input: CreateQuestionInput!): Question!
    updateQuestion(id: ID!, input: CreateQuestionInput!): Question!
    deleteQuestion(id: ID!): Boolean!
    bulkImportQuestions(questions: [CreateQuestionInput!]!): Int!

    # Exams
    createExam(input: CreateExamInput!): Exam!
    updateExam(id: ID!, input: UpdateExamInput!): Exam!
    publishExam(id: ID!): Exam!
    unpublishExam(id: ID!): Exam!
    deleteExam(id: ID!): Boolean!
    addQuestionsToExam(examId: ID!, questionIds: [String!]!): Exam!
    removeQuestionFromExam(examId: ID!, questionId: ID!): Exam!
    reorderExamQuestions(examId: ID!, questionIds: [String!]!): Exam!
    inviteCandidates(examId: ID!, emails: [String!]!): Boolean!

    # Exam Attempt
    startAttempt(examId: ID!, accessCode: String): ExamAttempt!
    submitAnswer(input: SubmitAnswerInput!): Answer!
    flagQuestion(attemptId: ID!, questionId: ID!): Boolean!
    submitAttempt(attemptId: ID!): Result!
    executeCode(input: ExecuteCodeInput!): CodeExecutionResult!

    # Anti-Cheat
    logViolation(input: LogViolationInput!): CheatingLog!

    # Results
    gradeEssay(answerId: ID!, points: Float!, feedback: String): Answer!
    publishResults(examId: ID!): Boolean!

    # Notifications
    markNotificationRead(id: ID!): Notification!
    markAllNotificationsRead: Boolean!

    # Tags
    createTag(name: String!, color: String): Tag!
    deleteTag(id: ID!): Boolean!
  }

  # ============================================================
  # SUBSCRIPTIONS
  # ============================================================

  type Subscription {
    attemptStatusChanged(attemptId: ID!): ExamAttempt!
    violationDetected(examId: ID!): CheatingLog!
    examStatusChanged(examId: ID!): Exam!
  }
`
