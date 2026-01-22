export class CreatePatientDto {
  name: string;
  birthDate: string; // Vem como string do formulário (YYYY-MM-DD)
  customId: string;  // O ID que vai no código C (ex: SENSOR-PATIENT-002)
}