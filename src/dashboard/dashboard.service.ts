import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  MembershipStatus,
  MembershipType,
} from '../memberships/entities/membership.entity';

export interface MembershipStats {
  total: number;
  active: number;
  expired: number;
  pending: number;
  byType: {
    [key in MembershipType]?: number;
  };
  revenueCurrentMonth: number;
}

export interface AttendanceStats {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  averagePerDay: number;
  peakHours: { hour: number; count: number }[];
}

export interface BlogStats {
  totalPosts: number;
  totalViews: number;
  mostViewedPosts: { id: string; title: string; views: number }[];
}

export interface DashboardStats {
  memberships: MembershipStats;
  attendance: AttendanceStats;
  blog: BlogStats;
  newUsers: { count: number; percentChange: number };
}

@Injectable()
export class DashboardService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not defined');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Obtiene estadísticas generales para el dashboard
   */
  async getStats(): Promise<DashboardStats> {
    try {
      const [memberships, attendance, blog, newUsers] = await Promise.all([
        this.getMembershipStats(),
        this.getAttendanceStats(),
        this.getBlogStats(),
        this.getNewUsersStats(),
      ]);

      return {
        memberships,
        attendance,
        blog,
        newUsers,
      };
    } catch (error) {
      throw new HttpException(
        `Error al obtener estadísticas del dashboard: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene estadísticas de membresías
   */
  async getMembershipStats(): Promise<MembershipStats> {
    try {
      // Obtener todas las membresías
      const { data: memberships, error } = await this.supabase
        .from('memberships')
        .select('*');

      if (error) {
        throw new Error(`Error al obtener membresías: ${error.message}`);
      }

      // Contar membresías por estado
      const active = memberships.filter(
        (m) => m.status === MembershipStatus.ACTIVE,
      ).length;
      const expired = memberships.filter(
        (m) => m.status === MembershipStatus.EXPIRED,
      ).length;
      const pending = memberships.filter(
        (m) => m.status === MembershipStatus.PENDING,
      ).length;

      // Contar membresías por tipo
      const byType = memberships.reduce(
        (acc, m) => {
          acc[m.type] = (acc[m.type] || 0) + 1;
          return acc;
        },
        {} as { [key in MembershipType]?: number },
      );

      // Calcular ingresos del mes actual
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const revenueCurrentMonth = memberships
        .filter((m) => {
          const createdAt = new Date(m.created_at);
          return createdAt >= firstDayOfMonth;
        })
        .reduce((sum, m) => sum + m.price, 0);

      return {
        total: memberships.length,
        active,
        expired,
        pending,
        byType,
        revenueCurrentMonth,
      };
    } catch (error) {
      throw new Error(
        `Error al obtener estadísticas de membresías: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene estadísticas de asistencia
   */
  async getAttendanceStats(): Promise<AttendanceStats> {
    try {
      // Obtener todas las asistencias
      const { data: attendances, error } = await this.supabase
        .from('attendance')
        .select('*');

      if (error) {
        throw new Error(`Error al obtener asistencias: ${error.message}`);
      }

      // Fecha actual
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);

      // Filtrar asistencias por fecha
      const todayAttendances = attendances.filter((a) => {
        const date = new Date(a.check_in_time);
        return date >= today;
      });

      const weekAttendances = attendances.filter((a) => {
        const date = new Date(a.check_in_time);
        return date >= oneWeekAgo;
      });

      const monthAttendances = attendances.filter((a) => {
        const date = new Date(a.check_in_time);
        return date >= oneMonthAgo;
      });

      // Calcular promedio diario (último mes)
      const averagePerDay = monthAttendances.length / 30;

      // Calcular horas pico
      const hourCounts = new Array(24).fill(0);
      attendances.forEach((a) => {
        const date = new Date(a.check_in_time);
        hourCounts[date.getHours()]++;
      });

      const peakHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalToday: todayAttendances.length,
        totalWeek: weekAttendances.length,
        totalMonth: monthAttendances.length,
        averagePerDay,
        peakHours,
      };
    } catch (error) {
      throw new Error(
        `Error al obtener estadísticas de asistencia: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene estadísticas del blog
   */
  async getBlogStats(): Promise<BlogStats> {
    try {
      // Obtener todos los posts del blog
      const { data: posts, error } = await this.supabase
        .from('posts')
        .select('*');

      if (error) {
        throw new Error(`Error al obtener posts del blog: ${error.message}`);
      }

      // Calcular total de vistas
      const totalViews = posts.reduce(
        (sum, post) => sum + (post.views || 0),
        0,
      );

      // Obtener posts más vistos
      const mostViewedPosts = [...posts]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map((post) => ({
          id: post.id,
          title: post.title,
          views: post.views || 0,
        }));

      return {
        totalPosts: posts.length,
        totalViews,
        mostViewedPosts,
      };
    } catch (error) {
      throw new Error(
        `Error al obtener estadísticas del blog: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene estadísticas de nuevos usuarios
   */
  async getNewUsersStats(): Promise<{ count: number; percentChange: number }> {
    try {
      // Fecha actual
      const now = new Date();
      const firstDayCurrentMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
      const firstDayPreviousMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const lastDayPreviousMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
      );

      // Obtener usuarios creados este mes
      const { data: currentMonthUsers, error: currentError } =
        await this.supabase
          .from('users')
          .select('id')
          .gte('created_at', firstDayCurrentMonth.toISOString());

      if (currentError) {
        throw new Error(
          `Error al obtener usuarios actuales: ${currentError.message}`,
        );
      }

      // Obtener usuarios creados el mes pasado
      const { data: previousMonthUsers, error: previousError } =
        await this.supabase
          .from('users')
          .select('id')
          .gte('created_at', firstDayPreviousMonth.toISOString())
          .lt('created_at', lastDayPreviousMonth.toISOString());

      if (previousError) {
        throw new Error(
          `Error al obtener usuarios anteriores: ${previousError.message}`,
        );
      }

      const currentCount = currentMonthUsers.length;
      const previousCount = previousMonthUsers.length;

      // Calcular cambio porcentual
      const percentChange =
        previousCount === 0
          ? 100 // Si no había usuarios el mes pasado, el aumento es del 100%
          : ((currentCount - previousCount) / previousCount) * 100;

      return {
        count: currentCount,
        percentChange,
      };
    } catch (error) {
      throw new Error(
        `Error al obtener estadísticas de nuevos usuarios: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene datos para el gráfico de ingresos mensuales
   */
  async getMonthlyRevenueData(): Promise<{ month: string; revenue: number }[]> {
    try {
      const now = new Date();
      const result: { month: string; revenue: number }[] = [];

      // Obtener datos para los últimos 12 meses
      for (let i = 0; i < 12; i++) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(
          now.getFullYear(),
          now.getMonth() - i + 1,
          0,
        );

        const { data, error } = await this.supabase
          .from('memberships')
          .select('price')
          .gte('created_at', month.toISOString())
          .lt('created_at', nextMonth.toISOString());

        if (error) {
          throw new Error(
            `Error al obtener datos de ingresos: ${error.message}`,
          );
        }

        const revenue = data.reduce((sum, m) => sum + m.price, 0);
        const monthName = month.toLocaleDateString('es-AR', { month: 'short' });

        result.unshift({
          month: monthName,
          revenue,
        });
      }

      return result;
    } catch (error) {
      throw new Error(
        `Error al obtener datos de ingresos mensuales: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene datos para el gráfico de asistencia diaria
   */
  async getDailyAttendanceData(): Promise<{ date: string; count: number }[]> {
    try {
      const now = new Date();
      const result: { date: string; count: number }[] = [];

      // Obtener datos para los últimos 30 días
      for (let i = 0; i < 30; i++) {
        const day = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i,
        );
        const nextDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i + 1,
        );

        const { data, error } = await this.supabase
          .from('attendance')
          .select('id')
          .gte('check_in_time', day.toISOString())
          .lt('check_in_time', nextDay.toISOString());

        if (error) {
          throw new Error(
            `Error al obtener datos de asistencia: ${error.message}`,
          );
        }

        const dateStr = day.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
        });

        result.unshift({
          date: dateStr,
          count: data.length,
        });
      }

      return result;
    } catch (error) {
      throw new Error(
        `Error al obtener datos de asistencia diaria: ${error.message}`,
      );
    }
  }
}
