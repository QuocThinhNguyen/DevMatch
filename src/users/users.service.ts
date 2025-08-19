import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User as UserM, UserDocument } from './schemas/user.schema';
import mongoose, { Model } from 'mongoose';
import { genSaltSync, hashSync, compareSync } from 'bcryptjs';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from './users.interface';
import aqp from 'api-query-params';
import { User } from 'src/decorator/customize';
import { emit } from 'process';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserM.name)
    private userModel: SoftDeleteModel<UserDocument>,
  ) {}

  getHashPassword = (password: string) => {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    return hash;
  };

  async create(createUserDto: CreateUserDto, @User() user: IUser) {
    const checkEmail = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (checkEmail)
      throw new BadRequestException(
        `Email ${createUserDto.email} đã tồn tại. Vui lòng dùng email khác`,
      );
    const hashPassword = this.getHashPassword(createUserDto.password);
    let userCreate = await this.userModel.create({
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashPassword,
      age: createUserDto.age,
      gender: createUserDto.gender,
      address: createUserDto.address,
      role: createUserDto.role,
      company: {
        _id: createUserDto.company._id,
        name: createUserDto.company.name,
      },
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });
    return {
      _id: userCreate._id,
      createdAt: userCreate.createdAt,
    };
  }

  // async create(email: string, password: string, name: string) {
  //   const hashPassword = this.getHashPassword(password);
  //   let user = await this.userModel.create({
  //     email,
  //     password: hashPassword,
  //     name,
  //   });
  //   return user;
  // }

  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, population } = aqp(qs);
    delete filter.page;
    delete filter.limit;

    // console.log(filter);

    let offset = (+currentPage - 1) * +limit;
    let defaultLimit = +limit ? +limit : 10;

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.userModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .select('-password')
      .populate(population)
      .exec();
    return {
      meta: {
        current: currentPage, //trang hiện tại
        pageSize: limit, //số lượng bản ghi đã lấy
        pages: totalPages, //tổng số trang với điều kiện query
        total: totalItems, // tổng số phần tử (số bản ghi)
      },
      result, //kết quả query
    };
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return 'not find user';
    return await this.userModel
      .findOne({
        _id: id,
      })
      .select('-password');
  }

  findOneByUsername(username: string) {
    return this.userModel.findOne({
      email: username,
    });
  }

  isValidPassword(password: string, hash: string) {
    return compareSync(password, hash);
  }

  findOneByEmail(email: string) {
    return this.userModel.findOne({
      email: email,
    });
  }

  async update(updateUserDto: UpdateUserDto, user: IUser) {
    return await this.userModel.updateOne(
      {
        _id: updateUserDto._id,
      },
      {
        ...updateUserDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) return 'not find user';

    await this.userModel.updateOne(
      {
        _id: id,
      },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    return this.userModel.softDelete({
      _id: id,
    });
  }

  updateUserToken = async (refreshToken: string, _id: string) => {
    return await this.userModel.updateOne(
      {
        _id: _id,
      },
      {
        refreshToken,
      },
    );
  };
}
