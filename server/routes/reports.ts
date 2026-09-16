import { Router } from 'express';
import { ReportModel, AnnouncementModel } from '../models/Report';
import { UserModel } from '../models/User';
import { NotificationModel } from '../models/Notification';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { serializeReport, serializeAnnouncement, serializeNotification } from '../serialize';
import { emitToUser, emitToUsers } from '../realtime';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

async function requireAdmin(req: AuthedRequest, res: any): Promise<boolean> {
  const me = await UserModel.findById(req.userId);
  if (!me || me.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền này.' });
    return false;
  }
  return true;
}

reportsRouter.get('/', async (req: AuthedRequest, res) => {
  if (!(await requireAdmin(req, res))) return;
  const reports = await ReportModel.find().sort({ createdAt: -1 }).populate('reporter');
  res.json({ reports: reports.map(serializeReport) });
});

reportsRouter.post('/', async (req: AuthedRequest, res) => {
  const { targetType, targetId, targetName, reason, description } = req.body;
  const report = await ReportModel.create({
    reporter: req.userId,
    targetType,
    targetId,
    targetName,
    reason,
    description,
  });
  await report.populate('reporter');
  res.json({ report: serializeReport(report) });

  // Admins watching the reports page shouldn't need to reload to see a brand-new report.
  const admins = await UserModel.find({ role: 'admin' }, '_id');
  emitToUsers(
    admins.map((a) => a._id.toString()),
    'report:new',
    { report: serializeReport(report) }
  );
});

reportsRouter.patch('/:id/resolve', async (req: AuthedRequest, res) => {
  if (!(await requireAdmin(req, res))) return;
  const report = await ReportModel.findByIdAndUpdate(
    req.params.id,
    { status: 'resolved', resolutionNote: req.body.note || 'Đã xử lý' },
    { new: true }
  ).populate('reporter');
  res.json({ report: report && serializeReport(report) });
  if (report) {
    const admins = await UserModel.find({ role: 'admin' }, '_id');
    emitToUsers(
      admins.map((a) => a._id.toString()),
      'report:update',
      { report: serializeReport(report) }
    );
  }
});

reportsRouter.patch('/:id/dismiss', async (req: AuthedRequest, res) => {
  if (!(await requireAdmin(req, res))) return;
  const report = await ReportModel.findByIdAndUpdate(
    req.params.id,
    { status: 'dismissed' },
    { new: true }
  ).populate('reporter');
  res.json({ report: report && serializeReport(report) });
  if (report) {
    const admins = await UserModel.find({ role: 'admin' }, '_id');
    emitToUsers(
      admins.map((a) => a._id.toString()),
      'report:update',
      { report: serializeReport(report) }
    );
  }
});

reportsRouter.get('/announcements', async (_req, res) => {
  const anns = await AnnouncementModel.find().sort({ createdAt: -1 }).populate('createdBy');
  res.json({ announcements: anns.map(serializeAnnouncement) });
});

reportsRouter.post('/announcements', async (req: AuthedRequest, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { title, message, type } = req.body;
  const ann = await AnnouncementModel.create({ title, message, type, createdBy: req.userId });
  await ann.populate('createdBy');

  const [allUsers, actorUser] = await Promise.all([UserModel.find({}, '_id'), UserModel.findById(req.userId)]);
  const created = await NotificationModel.insertMany(
    allUsers.map((u) => ({
      user: u._id,
      actor: req.userId,
      type: 'moderation',
      content: `${title}: ${message}`,
      targetType: 'system',
      targetId: ann._id.toString(),
    }))
  );

  // insertMany doesn't populate refs — push the same already-loaded admin doc into each
  // notification in memory so every recipient gets the live push instantly, not just on next fetch.
  for (const notif of created) {
    const withActor = { ...(notif as any).toObject(), actor: actorUser };
    emitToUser((notif as any).user.toString(), 'notification:new', serializeNotification(withActor));
  }

  res.json({ announcement: serializeAnnouncement(ann) });
});

reportsRouter.delete('/announcements/:id', async (req: AuthedRequest, res) => {
  if (!(await requireAdmin(req, res))) return;
  await AnnouncementModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});
