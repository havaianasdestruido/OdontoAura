import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../common/auth-user';

export interface DashboardStats {
  todayAppointments: number;
  activePatients: number;
  doctors: number;
  medicalRecords: number;
  upcomingAppointments: {
    id: string;
    scheduledAt: string;
    status: string;
    durationMinutes: number;
    patient: { id: string; name: string };
    doctor: { id: string; name: string; licenseNumber: string };
    specialty: { name: string };
  }[];
}

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard summary stats and upcoming appointments' })
  async stats(@Request() req: { user: AuthUser }): Promise<DashboardStats> {
    const actor = req.user;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const doctorId =
      actor.role === Role.DOCTOR
        ? (await this.prisma.doctorProfile.findUnique({ where: { userId: actor.id }, select: { id: true } }))?.id
        : undefined;

    const scope = doctorId ? { doctorId } : {};

    const [todayAppointments, activePatients, doctors, medicalRecords, upcomingRows] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          ...scope,
          scheduledAt: { gte: startOfDay, lte: endOfDay },
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
        },
      }),
      this.prisma.user.count({ where: { role: Role.PATIENT } }),
      this.prisma.doctorProfile.count(),
      this.prisma.medicalRecord.count({ where: { voidedAt: null } }),
      this.prisma.appointment.findMany({
        where: {
          ...scope,
          scheduledAt: { gte: new Date() },
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: {
          patient: { select: { id: true, name: true } },
          doctor: { select: { id: true, licenseNumber: true, user: { select: { name: true } } } },
          specialty: { select: { name: true } },
        },
      }),
    ]);

    return {
      todayAppointments,
      activePatients,
      doctors,
      medicalRecords,
      upcomingAppointments: upcomingRows.map((apt) => ({
        id: apt.id,
        scheduledAt: apt.scheduledAt.toISOString(),
        status: apt.status,
        durationMinutes: apt.durationMinutes,
        patient: apt.patient,
        doctor: { id: apt.doctor.id, name: apt.doctor.user.name, licenseNumber: apt.doctor.licenseNumber },
        specialty: apt.specialty,
      })),
    };
  }
}