import { AppDataSource } from "../data-source";
import { AppError } from "../errors/AppError";
import { User } from "../entities/user.entity";
import { IUserCreate, IUser, IUserLogin } from "../interfaces/user";
import bcrypt, { compare } from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";

class UsersServices {
  static async createUserService({ name, email, password }: IUserCreate): Promise<IUser> {
    const usersRepository = AppDataSource.getRepository(User);
    const users = await usersRepository.find();
    const emailExists = users.find((el) => el.email === email);

    if (emailExists) {
      throw new AppError(409, "E-mail already exists!");
    }

    const user = usersRepository.create({
      name,
      email,
      password: bcrypt.hashSync(password, 10),
      active: true
    });

    await usersRepository.save(user);
    return user;
  }

  static async loginUserService({
    email,
    password,
  }: IUserLogin): Promise<string> {
    const usersRepository = AppDataSource.getRepository(User);

    const user = await usersRepository.findOne({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new AppError(403, "Invalid credentials");
    }

    if (!user.active) {
      throw new Error("Inactive user");
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError(403, "Invalid credentials");
    }

    const token = jwt.sign(
      {
        id: user.id,
        isAdm: user.isAdm,
      },
      process.env.SECRET_KEY as string,
      {
        expiresIn: "12h",
      }
    );

    return token;
  }

  static async retrieveUserService(id: string) {
    const usersRepository = AppDataSource.getRepository(User);
    const users = await usersRepository.find();
    const userFound = users.find((el) => el.id === id);

    if (!userFound) {
      throw new AppError(404, "User not found");
    }

    return userFound;
  }

  static async updateUserService(id: string, data: IUserCreate) {
    const usersRepository = AppDataSource.getTreeRepository(User);
    const users = await usersRepository.find();
    const userFound = users.find((el) => el.id === id);

    if (!userFound) {
      throw new AppError(404, "User not found");
    }

    const user = await usersRepository.update(userFound!.id, data);

    if (user.affected === 1) {
      const userUpdated = await usersRepository.findOneBy({ id: id });
      return userUpdated;
    }
  }

  static async deleteUserService(id: string): Promise<void> {
    const usersRepository = AppDataSource.getRepository(User);
    const userFound = await usersRepository.findOneBy({ id: id });

    if (!userFound) {
      throw new AppError(404, "User not found");
    }
    //await usersRepository.delete(userFound!.id);

    if (!userFound.active) {
      throw new Error("Inactivated user");
    }

    userFound.active = false
    await usersRepository.save(userFound)
  }

  static async listUsersService(): Promise<User[]> {
    const usersRepository = AppDataSource.getRepository(User);
    const users = await usersRepository.find();

    return users;
  }
}
export default UsersServices;
