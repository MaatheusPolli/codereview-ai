## Naming Conventions
- Local variables: prefix 'l' → lName, lValue
- Parameters: prefix 'a' → aName, aValue
- Class fields: prefix 'F' → FName, FValue

## Forbidden Patterns
- SQL string concatenation with + operator
- Empty except blocks without logging
- Direct Query.SQL.Text assignment in production

## Required Patterns
- All forms must inherit from TBaseForm
- Connections via TConnectionFactory.GetInstance only
- Errors logged via TLogger.Error()
