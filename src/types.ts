export interface LockData {
  packages: Record<string, any>,
  dependencies: Record<string, any>
}

export interface PackageItem {
  name: string,
  resolved: string,
  path: string,
  v: string,
  integrity?: string
}
