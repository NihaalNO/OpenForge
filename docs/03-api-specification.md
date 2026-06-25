# OpenSource Compass - API Specification

## Conventions

- Base path: `/api/v1`
- Authentication: `Authorization: Bearer <supabase_access_token>`
- Response format: JSON
- Error format:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

Common errors: `401 unauthorized`, `403 forbidden`, `404 not_found`, `409 conflict`, `422 validation_error`, `429 rate_limited`, `500 internal_error`.

## Authentication

### Get Current User

`GET /auth/me`

Auth required: yes.

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Ada",
    "avatarUrl": "https://...",
    "onboardingCompleted": true,
    "github": {
      "username": "ada",
      "connected": true,
      "lastSyncedAt": "2026-06-26T00:00:00Z"
    }
  }
}
```

Errors: `401` when token is missing or invalid.

### Check Session

`GET /auth/session`

Auth required: yes.

Response:

```json
{
  "valid": true,
  "expiresAt": "2026-06-26T12:00:00Z"
}
```

Errors: `401` when session is invalid.

### Logout

`POST /auth/logout`

Auth required: yes.

Request body: none.

Response:

```json
{ "success": true }
```

Behavior: frontend signs out through Supabase; backend may revoke server-side session references if stored.

## GitHub

### Fetch GitHub Profile

`GET /github/profile`

Auth required: yes.

Response:

```json
{
  "profile": {
    "username": "ada",
    "name": "Ada Lovelace",
    "avatarUrl": "https://...",
    "bio": "Developer",
    "publicRepos": 24,
    "followers": 120,
    "following": 30,
    "languages": ["TypeScript", "Python"]
  }
}
```

Errors: `404 github_account_not_connected`, `429 github_rate_limited`.

### Sync Repositories

`POST /github/repositories/sync`

Auth required: yes.

Request:

```json
{
  "force": false,
  "includeForks": false
}
```

Response:

```json
{
  "jobId": "uuid",
  "status": "queued"
}
```

Errors: `429 github_rate_limited`, `422 invalid_sync_options`.

### Analyze GitHub Profile

`POST /github/profile/analyze`

Auth required: yes.

Request:

```json
{
  "refreshData": true
}
```

Response:

```json
{
  "skillProfile": {
    "experienceLevel": "intermediate",
    "skillScore": 72.5,
    "languages": { "TypeScript": 88, "Python": 64 },
    "frameworks": { "React": 82, "Express": 60 }
  }
}
```

Errors: `404 github_account_not_connected`, `422 insufficient_github_data`.

### Get Repository Details

`GET /github/repositories/:owner/:repo`

Auth required: yes.

Response:

```json
{
  "repository": {
    "id": "uuid",
    "fullName": "owner/repo",
    "description": "Project description",
    "starsCount": 1200,
    "forksCount": 230,
    "primaryLanguage": "TypeScript",
    "topics": ["react", "opensource"],
    "licenseKey": "mit",
    "healthScore": 84.2,
    "difficultyLevel": "beginner"
  }
}
```

Errors: `404 repository_not_found`, `429 github_rate_limited`.

### Get Repository Issues

`GET /github/repositories/:owner/:repo/issues?state=open&labels=good%20first%20issue&page=1&limit=20`

Auth required: yes.

Response:

```json
{
  "issues": [
    {
      "id": "uuid",
      "number": 42,
      "title": "Improve onboarding docs",
      "labels": ["good first issue"],
      "difficultyLevel": "beginner",
      "estimatedEffortHours": 3,
      "htmlUrl": "https://github.com/owner/repo/issues/42"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1 }
}
```

Errors: `404 repository_not_found`, `422 invalid_query`.

## Recommendations

### Get Recommended Repositories

`GET /recommendations/repositories?limit=20&language=TypeScript&level=beginner`

Auth required: yes.

Response:

```json
{
  "recommendations": [
    {
      "id": "uuid",
      "score": 91.2,
      "reason": "Strong TypeScript and React match with active beginner issues.",
      "repository": {
        "id": "uuid",
        "fullName": "owner/repo",
        "starsCount": 1200,
        "primaryLanguage": "TypeScript"
      }
    }
  ]
}
```

Errors: `422 invalid_filters`.

### Get Recommended Issues

`GET /recommendations/issues?limit=20&repositoryId=uuid`

Auth required: yes.

Response:

```json
{
  "recommendations": [
    {
      "id": "uuid",
      "score": 88.4,
      "reason": "Matches React skills and has a small documentation scope.",
      "issue": {
        "id": "uuid",
        "title": "Add example for hooks",
        "number": 15
      }
    }
  ]
}
```

Errors: `422 invalid_filters`.

### Save Repository

`POST /saved/repositories`

Auth required: yes.

Request:

```json
{
  "repositoryId": "uuid",
  "notes": "Good starter project"
}
```

Response:

```json
{
  "savedRepository": {
    "id": "uuid",
    "repositoryId": "uuid",
    "notes": "Good starter project"
  }
}
```

Errors: `404 repository_not_found`, `409 already_saved`.

### Save Issue

`POST /saved/issues`

Auth required: yes.

Request:

```json
{
  "issueId": "uuid",
  "notes": "Try this weekend",
  "status": "saved"
}
```

Response:

```json
{
  "savedIssue": {
    "id": "uuid",
    "issueId": "uuid",
    "status": "saved"
  }
}
```

Errors: `404 issue_not_found`, `409 already_saved`.

## AI

### Analyze Repository

`POST /ai/repositories/:repositoryId/analyze`

Auth required: yes.

Request:

```json
{
  "analysisDepth": "standard",
  "refresh": false
}
```

Response:

```json
{
  "analysis": {
    "summary": "Plain-language summary",
    "architecture": "Architecture overview",
    "importantFiles": ["package.json", "src/index.ts"],
    "entryPoints": ["src/index.ts"],
    "difficultyLevel": "beginner"
  }
}
```

Errors: `404 repository_not_found`, `429 ai_rate_limited`, `422 repository_too_large`.

### Explain Issue

`POST /ai/issues/:issueId/explain`

Auth required: yes.

Request:

```json
{
  "includeImplementationPlan": true
}
```

Response:

```json
{
  "explanation": {
    "summary": "Simplified explanation",
    "requiredKnowledge": ["React props", "Markdown"],
    "relevantFiles": ["docs/examples.md"],
    "approach": ["Read current examples", "Add missing case", "Run docs tests"],
    "estimatedCompletionTime": "2-4 hours",
    "learningOutcome": "Learn project documentation workflow"
  }
}
```

Errors: `404 issue_not_found`, `429 ai_rate_limited`.

### Generate Learning Roadmap

`POST /ai/roadmaps`

Auth required: yes.

Request:

```json
{
  "goal": "Contribute to React projects",
  "targetLevel": "intermediate",
  "timePerWeekHours": 6
}
```

Response:

```json
{
  "roadmap": {
    "id": "uuid",
    "title": "React Open Source Roadmap",
    "estimatedWeeks": 8,
    "items": []
  }
}
```

Errors: `422 invalid_goal`, `429 ai_rate_limited`.

### Generate Contribution Plan

`POST /ai/contribution-plan`

Auth required: yes.

Request:

```json
{
  "repositoryId": "uuid",
  "issueId": "uuid"
}
```

Response:

```json
{
  "plan": {
    "steps": ["Set up repository", "Reproduce issue", "Implement change"],
    "risks": ["Issue may already be assigned"],
    "expectedOutput": "Small pull request with tests or docs update"
  }
}
```

Errors: `404 repository_or_issue_not_found`, `429 ai_rate_limited`.

## Dashboard

### Get Contribution Stats

`GET /dashboard/contribution-stats?period=90d`

Auth required: yes.

Response:

```json
{
  "stats": {
    "prsOpened": 8,
    "prsMerged": 5,
    "issuesSolved": 3,
    "repositoriesContributed": 4,
    "contributionStreakDays": 12,
    "languages": { "TypeScript": 70, "Python": 30 }
  }
}
```

Errors: `422 invalid_period`.

### Get Dashboard Summary

`GET /dashboard/summary`

Auth required: yes.

Response:

```json
{
  "summary": {
    "recommendedRepositoriesCount": 12,
    "recommendedIssuesCount": 25,
    "savedRepositoriesCount": 4,
    "savedIssuesCount": 6,
    "unreadNotificationsCount": 2,
    "skillScore": 72.5
  }
}
```

Errors: `401 unauthorized`.

## Notifications

### List Notifications

`GET /notifications?unreadOnly=false&page=1&limit=20`

Auth required: yes.

Response:

```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "matching_issue",
      "title": "New matching issue",
      "body": "A beginner-friendly TypeScript issue was found.",
      "actionUrl": "/app/issues/uuid",
      "readAt": null,
      "createdAt": "2026-06-26T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1 }
}
```

Errors: `422 invalid_query`.

### Mark Notification as Read

`PATCH /notifications/:notificationId/read`

Auth required: yes.

Request body: none.

Response:

```json
{
  "notification": {
    "id": "uuid",
    "readAt": "2026-06-26T00:00:00Z"
  }
}
```

Errors: `404 notification_not_found`.

