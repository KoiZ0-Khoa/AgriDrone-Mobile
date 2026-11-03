export type Page<T> = { items: T[]; pageNumber: number; pageSize: number; totalCount: number; hasNextPage: boolean }
export type AssignedFarm = { tenantId: string; farmId: string; code: string; name: string; address: string | null; areaHectares: number | null; assignedAt: string }
export type PublicService = { surveyServiceId: string; code: string; name: string; description: string; serviceType: string; isExperimental: boolean; indicativePrice: { amountPerPole: number; currency: string } }
export type Intake = { surveyServiceId: string; farmName?: string; farmAddress?: string; approximateAreaHa?: number; longitude?: number; latitude?: number; estimatedPoleCount: number | null; preferredStartAt: string | null; preferredEndAt: string | null; notes: string | null }
