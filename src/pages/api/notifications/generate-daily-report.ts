import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import { generateAndSendDailyAttendanceReport } from '@/util/notifications';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if cookies exist in the request
    if (!req.cookies || Object.keys(req.cookies).length === 0) {
      return res.status(401).json({ error: 'No authentication cookies found' });
    }

    let user;
    try {
      // Verify authentication
      const supabase = createClient({ req, res });
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data.user) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      user = data.user;
    } catch (authError) {
      console.error('Error in authentication:', authError);
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Check if user is admin using Prisma instead of Supabase
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

    return res.status(200).json({ success: true, reportId: result.reportId });
  } catch (error) {
    console.error('Error generating daily report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}