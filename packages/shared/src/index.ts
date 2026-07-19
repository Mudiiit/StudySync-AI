export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export interface UserDTO {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
}
