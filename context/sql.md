## Performance
- Avoid SELECT *; specify only required columns
- Ensure WHERE clauses use indexed columns
- Avoid subqueries in SELECT if JOIN is possible

## Security
- Use parameterized queries; never concatenate strings
- Never store passwords in plain text
- Sanitize all user inputs before use in dynamic SQL

## Readability
- Use UPPERCASE for SQL keywords (SELECT, FROM, WHERE)
- Use meaningful table aliases
- Format queries with clear indentation
