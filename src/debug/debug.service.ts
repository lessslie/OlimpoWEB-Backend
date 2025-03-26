import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DebugService {
  private readonly logger = new Logger(DebugService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Supabase environment variables are not defined');
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  async checkSupabaseConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('attendances').select('count');
      return !error;
    } catch (error) {
      this.logger.error(`Error connecting to Supabase: ${error.message}`);
      return false;
    }
  }

  async checkMembership(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('memberships')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        this.logger.error(`Error fetching memberships: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error(`Exception checking membership: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async logQRData(data: any): Promise<void> {
    try {
      // Log QR data to a debug table in Supabase
      await this.supabase.from('debug_logs').insert([
        {
          type: 'qr_scan',
          data: JSON.stringify(data),
          created_at: new Date().toISOString(),
        },
      ]);
      this.logger.log('QR data logged successfully');
    } catch (error) {
      this.logger.error(`Error logging QR data: ${error.message}`);
    }
  }
}
