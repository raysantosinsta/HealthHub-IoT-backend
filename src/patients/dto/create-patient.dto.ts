import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  IsDateString, 
  IsArray, 
  ValidateNested, 
  IsNumber,
  IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';


// Classe auxiliar para validar cada item da lista de limites
class PatientThresholdConfigDto {
  @IsNotEmpty()
  @IsString()
  activityPatternId: string; // O ID da atividade (Ex: ID do "Dormindo")

  @IsNumber()
  bpmMin: number;

  @IsNumber()
  bpmMax: number;

  @IsNumber()
  spo2Min: number;
}


export class CreatePatientDto {
  @IsNotEmpty() @IsString()
  customId: string;

  @IsNotEmpty() @IsString()
  name: string;

  @IsNotEmpty() @IsEmail()
  email: string;

  @IsNotEmpty() @IsString()
  password: string; // Adicione este campo

  @IsNotEmpty()
  birthDate: string;

  @IsArray()
  thresholds: any[];
}