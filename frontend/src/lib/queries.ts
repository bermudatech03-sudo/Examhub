import { gql } from '@apollo/client'

// ============================================================
// FRAGMENTS
// ============================================================

export const USER_FRAGMENT = gql`
  fragment UserFragment on User {
    id email firstName lastName fullName avatarUrl
    role status organizationId emailVerified lastLoginAt
    organization { id name slug logoUrl }
  }
`

export const EXAM_FRAGMENT = gql`
  fragment ExamFragment on Exam {
    id title description instructions status duration
    totalPoints passingScore maxAttempts shuffleQuestions
    shuffleOptions showResults showCorrectAnswers isProctored
    allowBacktrack startsAt endsAt accessCode thumbnailUrl
    category tags attemptCount createdAt updatedAt
    createdBy { id firstName lastName }
    organization { id name }
    questions {
      id orderIndex points
      question {
        id type difficulty title content points timeLimit
        options { id content isCorrect orderIndex }
        codingProblem { languages timeLimit memoryLimit boilerplate testCases }
        tags { id name color }
      }
    }
  }
`

export const QUESTION_FRAGMENT = gql`
  fragment QuestionFragment on Question {
    id type difficulty subject title content explanation
    points timeLimit isPublic isActive createdAt
    tags { id name color }
    options { id content isCorrect orderIndex }
    codingProblem { id languages boilerplate testCases timeLimit memoryLimit }
  }
`

export const RESULT_FRAGMENT = gql`
  fragment ResultFragment on Result {
    id totalPoints earnedPoints percentage status
    rank percentile timeTaken gradedAt feedback isPublished createdAt
    exam { id title duration }
    certificate { id verifyCode pdfUrl issuedAt grade score }
    attempt { id candidate { id firstName lastName email } }
  }
`

// ============================================================
// AUTH QUERIES
// ============================================================

export const ME_QUERY = gql`
  query Me { me { ...UserFragment } }
  ${USER_FRAGMENT}
`

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user { ...UserFragment }
    }
  }
  ${USER_FRAGMENT}
`

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user { ...UserFragment }
    }
  }
  ${USER_FRAGMENT}
`

export const LOGOUT_MUTATION = gql`
  mutation Logout { logout }
`

export const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password)
  }
`

// ============================================================
// EXAM QUERIES
// ============================================================

export const GET_EXAMS = gql`
  query GetExams($filter: ExamFilterInput, $pagination: PaginationInput) {
    exams(filter: $filter, pagination: $pagination) {
      items { ...ExamFragment }
      total page pageSize
    }
  }
  ${EXAM_FRAGMENT}
`

export const GET_EXAM = gql`
  query GetExam($id: ID!) {
    exam(id: $id) { ...ExamFragment }
  }
  ${EXAM_FRAGMENT}
`

export const GET_AVAILABLE_EXAMS = gql`
  query GetAvailableExams {
    availableExams {
      id title description status duration totalPoints
      passingScore category tags attemptCount thumbnailUrl
      startsAt endsAt isProctored
      createdBy { firstName lastName }
      organization { name }
      questions { id }
    }
  }
`

export const CREATE_EXAM_MUTATION = gql`
  mutation CreateExam($input: CreateExamInput!) {
    createExam(input: $input) { ...ExamFragment }
  }
  ${EXAM_FRAGMENT}
`

export const UPDATE_EXAM_MUTATION = gql`
  mutation UpdateExam($id: ID!, $input: UpdateExamInput!) {
    updateExam(id: $id, input: $input) { ...ExamFragment }
  }
  ${EXAM_FRAGMENT}
`

export const PUBLISH_EXAM_MUTATION = gql`
  mutation PublishExam($id: ID!) {
    publishExam(id: $id) { id status }
  }
`

export const DELETE_EXAM_MUTATION = gql`
  mutation DeleteExam($id: ID!) {
    deleteExam(id: $id)
  }
`

export const ADD_QUESTIONS_TO_EXAM = gql`
  mutation AddQuestionsToExam($examId: ID!, $questionIds: [String!]!) {
    addQuestionsToExam(examId: $examId, questionIds: $questionIds) { ...ExamFragment }
  }
  ${EXAM_FRAGMENT}
`

// ============================================================
// ATTEMPT QUERIES
// ============================================================

export const START_ATTEMPT_MUTATION = gql`
  mutation StartAttempt($examId: ID!, $accessCode: String) {
    startAttempt(examId: $examId, accessCode: $accessCode) {
      id status startedAt violationCount
      exam { ...ExamFragment }
      answers { id questionId selectedOptions textAnswer timeSpent flagged }
    }
  }
  ${EXAM_FRAGMENT}
`

export const SUBMIT_ANSWER_MUTATION = gql`
  mutation SubmitAnswer($input: SubmitAnswerInput!) {
    submitAnswer(input: $input) {
      id questionId selectedOptions textAnswer isCorrect pointsAwarded flagged
    }
  }
`

export const SUBMIT_ATTEMPT_MUTATION = gql`
  mutation SubmitAttempt($attemptId: ID!) {
    submitAttempt(attemptId: $attemptId) {
      ...ResultFragment
    }
  }
  ${RESULT_FRAGMENT}
`

export const EXECUTE_CODE_MUTATION = gql`
  mutation ExecuteCode($input: ExecuteCodeInput!) {
    executeCode(input: $input) {
      status output executionTime memoryUsed testResults error
    }
  }
`

export const LOG_VIOLATION_MUTATION = gql`
  mutation LogViolation($input: LogViolationInput!) {
    logViolation(input: $input) {
      id type timestamp
    }
  }
`

// ============================================================
// QUESTION QUERIES
// ============================================================

export const GET_QUESTIONS = gql`
  query GetQuestions($filter: QuestionFilterInput, $pagination: PaginationInput) {
    questions(filter: $filter, pagination: $pagination) {
      items { ...QuestionFragment }
      total page pageSize
    }
  }
  ${QUESTION_FRAGMENT}
`

export const CREATE_QUESTION_MUTATION = gql`
  mutation CreateQuestion($input: CreateQuestionInput!) {
    createQuestion(input: $input) { ...QuestionFragment }
  }
  ${QUESTION_FRAGMENT}
`

export const UPDATE_QUESTION_MUTATION = gql`
  mutation UpdateQuestion($id: ID!, $input: CreateQuestionInput!) {
    updateQuestion(id: $id, input: $input) { ...QuestionFragment }
  }
  ${QUESTION_FRAGMENT}
`

export const DELETE_QUESTION_MUTATION = gql`
  mutation DeleteQuestion($id: ID!) {
    deleteQuestion(id: $id)
  }
`

export const GET_TAGS = gql`
  query GetTags { tags { id name color } }
`

// ============================================================
// RESULTS
// ============================================================

export const GET_MY_RESULTS = gql`
  query GetMyResults($pagination: PaginationInput) {
    myResults(pagination: $pagination) {
      items { ...ResultFragment }
      total page pageSize
    }
  }
  ${RESULT_FRAGMENT}
`

export const GET_RESULT = gql`
  query GetResult($id: ID!) {
    result(id: $id) { ...ResultFragment }
  }
  ${RESULT_FRAGMENT}
`

export const GET_EXAM_RESULTS = gql`
  query GetExamResults($examId: String!) {
    examResults(examId: $examId) {
      items { ...ResultFragment }
      total
    }
  }
  ${RESULT_FRAGMENT}
`

export const GET_EXAM_STATS = gql`
  query GetExamStats($examId: String!) {
    examStats(examId: $examId) {
      totalAttempts avgScore passRate avgTimeTaken scoreDistribution
    }
  }
`

// ============================================================
// DASHBOARD
// ============================================================

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    dashboardStats {
      totalExams totalCandidates totalAttempts avgPassRate recentActivity
    }
  }
`

// ============================================================
// USERS
// ============================================================

export const GET_USERS = gql`
  query GetUsers($organizationId: String, $pagination: PaginationInput) {
    users(organizationId: $organizationId, pagination: $pagination) {
      items { ...UserFragment }
      total page pageSize
    }
  }
  ${USER_FRAGMENT}
`

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($firstName: String, $lastName: String, $avatarUrl: String) {
    updateProfile(firstName: $firstName, lastName: $lastName, avatarUrl: $avatarUrl) {
      ...UserFragment
    }
  }
  ${USER_FRAGMENT}
`

// ============================================================
// NOTIFICATIONS
// ============================================================

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($unreadOnly: Boolean) {
    myNotifications(unreadOnly: $unreadOnly) {
      id type title body isRead createdAt
    }
    unreadCount
  }
`

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) { id isRead }
  }
`

// ============================================================
// CERTIFICATES
// ============================================================

export const GET_MY_CERTIFICATES = gql`
  query GetMyCertificates {
    myCertificates {
      id examTitle candidateName score grade issuedAt verifyCode pdfUrl
    }
  }
`

export const VERIFY_CERTIFICATE = gql`
  query VerifyCertificate($code: String!) {
    verifyCertificate(code: $code) {
      id examTitle candidateName score grade issuedAt verifyCode
    }
  }
`

// ============================================================
// EXAM ATTEMPTS (for proctoring)
// ============================================================

export const GET_EXAM_ATTEMPTS = gql`
  query GetExamAttempts($examId: String!) {
    examAttempts(examId: $examId) {
      id status startedAt submittedAt violationCount isDisqualified
      candidate { id firstName lastName email }
      cheatingLogs { id type timestamp description }
      result { id percentage status }
    }
  }
`
