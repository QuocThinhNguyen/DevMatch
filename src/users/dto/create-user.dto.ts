import { IsEmail, IsNotEmpty } from 'class-validator';
// data transfer object // class = { }
export class CreateUserDto {
  @IsEmail({},{message:"Email không đúng định dạng"})
  @IsNotEmpty()
  email: string;
  @IsNotEmpty()
  password: string;

  name: string;
  address: string;
}
