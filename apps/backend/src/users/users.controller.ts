import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
  ParseEnumPipe,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuthUser } from '../common/auth-user';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'List all users (Admin/Employee)' })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  findAll(
    @Request() req: { user: AuthUser },
    @Query('role', new ParseEnumPipe(Role, { optional: true })) role?: Role,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip = 0,
    @Query('take', new DefaultValuePipe(500), ParseIntPipe) take = 500,
  ) {
    return this.usersService.findAll(role, req.user, skip, take);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: AuthUser }) {
    if (req.user.role !== Role.ADMIN && req.user.role !== Role.EMPLOYEE && req.user.id !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: { user: AuthUser },
  ) {
    if (dto.role === Role.ADMIN) {
      throw new ForbiddenException('Promoting a user to ADMIN is not allowed');
    }
    if (dto.role && dto.role !== req.user.role && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('You cannot change roles above your own');
    }
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiQuery({ name: 'confirm', required: true, type: Boolean })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: AuthUser },
    @Query('confirm') confirm?: string,
  ) {
    if (confirm !== 'true') {
      throw new BadRequestException('Deletion requires confirm=true query parameter');
    }
    if (id === req.user.id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const target = await this.usersService.findOne(id);
    if (target.role === Role.ADMIN) {
      throw new ForbiddenException('Admin accounts cannot be deleted');
    }
    return this.usersService.remove(id);
  }
}