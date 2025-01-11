# Planning System Commands Guide

## Overview
This guide outlines the commands available for managing project planning documents. These commands help maintain living documentation for features and track changes as they evolve.

## Available Commands

### 1. Generate Plan
**Command:** `Run generate-plan "Feature Name"`

**Purpose:**
- Creates a new planning document
- Use when starting a new feature/project
- Provides structured template

**Example:**
```bash
Run generate-plan "User Authentication"
```

**Generated Template:**
```markdown
# Feature: User Authentication
Created: [Date]
Status: Draft

## Overview
[Brief description]

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Technical Approach
- Architecture:
- Key Components:
- Dependencies:

## Timeline
- Phase 1:
- Phase 2:
- Phase 3:

## Risks & Considerations
- Risk 1:
- Risk 2:

## Notes
[Space for ongoing notes]
```

### 2. Add Note
**Command:** `Run add-note "Feature Name" --type "type"`

**Purpose:**
- Adds new information to existing plan
- Automatically timestamps entries
- Tracks evolving requirements/considerations

**Types:**
- technical: Technical considerations or decisions
- requirement: New requirements discovered
- risk: Newly identified risks
- general: General notes and observations

**Example:**
```bash
Run add-note "User Authentication" --type "technical"
```

**Output Format:**
```markdown
[Added 2024-01-15 14:30]
Type: Technical Note

Description: [Note content]
Impact: [Impact description]
Next Steps: [Action items]
```

### 3. Update Status
**Command:** `Run update-status "Feature Name" --phase "phase" --status "status"`

**Purpose:**
- Tracks feature progress
- Records blockers/issues
- Keeps team aligned on progress

**Example:**
```bash
Run update-status "User Authentication" --phase "Implementation" --status "in-progress"
```

**Output Format:**
```markdown
Status Updated: 2024-01-15 14:30
Phase: Implementation
Status: In Progress
Current Focus: [Description]
Blockers: [If any]
Next Steps: [Planned actions]
```

### 4. Update Plan
**Command:** `Run update-plan "Feature Name" --section "section"`

**Purpose:**
- Modifies existing sections of the plan
- Tracks changes and reasoning
- Preserves change history

**Example:**
```bash
Run update-plan "User Authentication" --section "Technical Approach"
```

**Output Format:**
```markdown
Update Made: 2024-01-15 14:30
Section: Technical Approach
Changed By: [User]

Changes:
- [Description of changes]

Reason for Update:
- [Explanation]

Previous Version:
[Preserved for history]
```

## Best Practices

1. **Document Creation**
   - Create plan at the start of new features
   - Use clear, descriptive feature names
   - Fill in all relevant sections

2. **Ongoing Documentation**
   - Add notes whenever new information is discovered
   - Update status at least weekly
   - Keep entries clear and concise

3. **Plan Updates**
   - Document reasons for changes
   - Update related sections for consistency
   - Preserve important historical information

## When to Use Each Command

| Command | When to Use |
|---------|------------|
| Generate Plan | Starting a new feature/project |
| Add Note | Discovering new information |
| Update Status | Progress made or blocked |
| Update Plan | Significant changes to approach/requirements |

## Tips for Effective Use

1. Be consistent with command usage
2. Keep updates atomic and focused
3. Include context with changes
4. Link related updates together
5. Regular status updates help track progress
6. Document decisions and their reasoning 