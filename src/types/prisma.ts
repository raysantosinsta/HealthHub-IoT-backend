// prisma/enums.ts

// -------------------------
// 1️⃣ Tipos de sinais vitais
// -------------------------
export enum VitalType {
  HEART_RATE = "HEART_RATE",
  BLOOD_PRESSURE = "BLOOD_PRESSURE",
  OXYGEN_SATURATION = "OXYGEN_SATURATION",
  TEMPERATURE = "TEMPERATURE",
}

// -------------------------
// 2️⃣ Níveis de risco para predição de saúde
// -------------------------
export enum RiskLevel {
  LOW = "LOW",
  MODERATE = "MODERATE",
  HIGH = "HIGH",
}

// -------------------------
// 3️⃣ Papéis de usuário
// -------------------------
export enum Role {
  ADMIN = "ADMIN",
  STAFF = "STAFF",
}
