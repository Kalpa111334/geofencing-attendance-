import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import { generateAndSendDailyAttendanceReport } from '@/util/notifications';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const supabase = createClient({ req, res });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    if (!userData || userData.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Generate and send daily attendance report
    const result = await generateAndSendDailyAttendanceReport();

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({ 
      success: true, 
      reportId: result.reportId,
      notificationResult: result.notificationResult
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}