export const PortTypes = {
  FLOW: 'flow',
  ANY: 'any',
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  OBJECT: 'object',
  ARRAY: 'array'
}

export function isTypeCompatible(sourceType, targetType) {
  if (sourceType === PortTypes.FLOW || targetType === PortTypes.FLOW) {
    return sourceType === targetType
  }
  if (sourceType === PortTypes.ANY || targetType === PortTypes.ANY) {
    return true
  }
  return sourceType === targetType
}
