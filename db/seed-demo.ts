import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../server/models/User';
import { PostModel } from '../server/models/Post';
import { CommentModel } from '../server/models/Comment';
import { FriendRequestModel, FriendshipModel } from '../server/models/FriendRequest';
import { GroupModel } from '../server/models/Group';
import { ConversationModel, MessageModel } from '../server/models/Conversation';
import { StoryModel } from '../server/models/Story';
import { NotificationModel } from '../server/models/Notification';
import { ReportModel, AnnouncementModel } from '../server/models/Report';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/social-network-app';

const AVATAR = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
const PHOTO = (seed: string, w = 800, h = 600) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${MONGODB_URI}`);

  console.log('Xoá dữ liệu cũ...');
  await Promise.all([
    UserModel.deleteMany({}),
    PostModel.deleteMany({}),
    CommentModel.deleteMany({}),
    FriendRequestModel.deleteMany({}),
    FriendshipModel.deleteMany({}),
    GroupModel.deleteMany({}),
    ConversationModel.deleteMany({}),
    MessageModel.deleteMany({}),
    StoryModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    ReportModel.deleteMany({}),
    AnnouncementModel.deleteMany({}),
  ]);

  console.log('Tạo người dùng...');
  const passwordHash = await bcrypt.hash('123456', 10);

  const usersRaw = [
    { name: 'Trần Xuân Hoàng', username: 'xuanhoang', email: 'xuanhoang@demo.vn', role: 'admin', bio: 'Quản trị viên hệ thống 👑', workplace: 'Social Network App', location: 'Hà Nội' },
    { name: 'Trần Quốc Bảo', username: 'quocbao', email: 'user1@demo.vn', bio: 'Yêu công nghệ & du lịch 🌍', workplace: 'FPT Software', location: 'Đà Nẵng' },
    { name: 'Lê Thị Cẩm', username: 'camle', email: 'user2@demo.vn', bio: 'Đam mê nhiếp ảnh 📸', workplace: 'Studio Cẩm', location: 'TP. Hồ Chí Minh' },
    { name: 'Phạm Đức Duy', username: 'ducduy', email: 'user3@demo.vn', bio: 'Sinh viên CNTT năm 4', workplace: 'Đại học Bách Khoa', location: 'Hà Nội' },
    { name: 'Hoàng Thu Hà', username: 'thuha', email: 'user4@demo.vn', bio: 'Thích đọc sách và cà phê ☕', workplace: 'NXB Trẻ', location: 'TP. Hồ Chí Minh' },
    { name: 'Vũ Anh Khoa', username: 'anhkhoa', email: 'user5@demo.vn', bio: 'Streamer / Gamer 🎮', workplace: 'Freelancer', location: 'Cần Thơ' },
    { name: 'Đặng Ngọc Linh', username: 'ngoclinh', email: 'user6@demo.vn', bio: 'Yêu ẩm thực, review đồ ăn 🍜', workplace: 'FoodTour VN', location: 'Đà Nẵng' },
    { name: 'Bùi Gia Phúc', username: 'giaphuc', email: 'user7@demo.vn', bio: 'Kỹ sư phần mềm', workplace: 'Viettel', location: 'Hà Nội' },
  ];

  const users = await UserModel.insertMany(
    usersRaw.map((u) => ({
      ...u,
      passwordHash,
      avatar: AVATAR(u.username),
      coverImage: PHOTO(`cover-${u.username}`, 1200, 400),
      role: u.role || 'user',
      isOnline: Math.random() > 0.5,
      lastActive: hoursAgo(Math.floor(Math.random() * 48)),
      joinDate: daysAgo(90 + Math.floor(Math.random() * 200)),
    }))
  );

  const [admin, bao, cam, duy, ha, khoa, linh, phuc] = users;

  console.log('Tạo quan hệ bạn bè...');
  const friendPairs: [any, any][] = [
    [bao, cam], [bao, duy], [bao, phuc],
    [cam, ha], [cam, linh],
    [duy, khoa], [duy, phuc],
    [ha, linh],
    [khoa, admin],
  ];
  await FriendshipModel.insertMany(
    friendPairs.map(([a, b]) => ({ userA: a._id, userB: b._id, createdAt: daysAgo(Math.floor(Math.random() * 60)) }))
  );
  // vài lời mời kết bạn đang chờ xử lý
  await FriendRequestModel.insertMany([
    { sender: linh._id, receiver: bao._id, createdAt: hoursAgo(5) },
    { sender: phuc._id, receiver: ha._id, createdAt: hoursAgo(20) },
  ]);

  console.log('Tạo nhóm...');
  const groupsRaw = [
    { name: 'Hội yêu Lập trình', description: 'Chia sẻ kiến thức lập trình, học tập và tìm việc IT.', creator: duy, members: [duy, bao, phuc, khoa, admin] },
    { name: 'Review Ẩm thực Việt', description: 'Địa điểm ăn ngon, review quán mới mỗi ngày.', creator: linh, members: [linh, ha, cam, bao] },
    { name: 'Nhiếp ảnh & Du lịch', description: 'Góc chia sẻ ảnh đẹp và kinh nghiệm du lịch.', creator: cam, members: [cam, bao, ha] },
  ];
  const groups = await GroupModel.insertMany(
    groupsRaw.map((g) => ({
      name: g.name,
      description: g.description,
      privacy: 'public',
      avatar: AVATAR(`group-${g.name}`),
      coverImage: PHOTO(`group-cover-${g.name}`, 1200, 400),
      creator: g.creator._id,
      members: g.members.map((m, i) => ({ user: m._id, role: i === 0 ? 'admin' : 'member', joinedAt: daysAgo(30 - i) })),
      createdAt: daysAgo(60),
    }))
  );

  console.log('Tạo bài viết...');
  const postTexts = [
    { author: bao, content: 'Vừa hoàn thành xong dự án mới, cảm giác thật tuyệt vời! 🚀', images: [PHOTO('post-bao-1')] },
    { author: cam, content: 'Bình minh trên vịnh Hạ Long đẹp không thể tả 🌅', images: [PHOTO('post-cam-1'), PHOTO('post-cam-2')] },
    { author: duy, content: 'Ai có tài liệu học React hay không cho mình xin với ạ 😅', images: [] },
    { author: ha, content: 'Cuốn sách tuần này: "Nhà giả kim". Rất đáng đọc!', images: [PHOTO('post-ha-1')] },
    { author: khoa, content: 'Tối nay live stream game mới lúc 20h, mọi người vào ủng hộ nha!', images: [PHOTO('post-khoa-1')] },
    { author: linh, content: 'Quán bún chả này ngon xuất sắc, phải thử ngay! 🍜', images: [PHOTO('post-linh-1')] },
    { author: phuc, content: 'Deploy thành công lên production sau một đêm thức trắng debug 😴', images: [] },
    { author: bao, content: 'Cuối tuần này đi cà phê không mọi người?', images: [] },
    { author: cam, content: 'Bộ ảnh chụp tại Đà Lạt tuần trước, mọi người thấy sao? 📷', images: [PHOTO('post-cam-3'), PHOTO('post-cam-4'), PHOTO('post-cam-5')] },
    { author: admin, content: 'Chào mừng mọi người đến với Social Network App! Hãy cùng chia sẻ những khoảnh khắc đáng nhớ nhé.', images: [PHOTO('post-admin-1')] },
    { author: duy, content: 'Hôm nay bảo vệ đồ án, hồi hộp quá 😰', images: [] },
    { author: ha, content: 'Trời Hà Nội vào thu đẹp thật sự', images: [PHOTO('post-ha-2')] },
    { author: khoa, content: 'Vừa unbox bàn phím cơ mới, gõ sướng tay ghê 😍', images: [PHOTO('post-khoa-2')] },
    { author: linh, content: 'Công thức nấu phở bò chuẩn vị Hà Nội, ai cần thì để lại comment nhé', images: [] },
    { author: phuc, content: 'Học thêm được một pattern hay trong lúc code hôm nay: Repository Pattern', images: [] },
  ];

  const reactionTypes = ['like', 'love', 'haha', 'wow'] as const;
  const posts = [];
  for (const p of postTexts) {
    const otherUsers = users.filter((u) => String(u._id) !== String(p.author._id));
    const reactionCount = Math.floor(Math.random() * 6);
    const reactors = [...otherUsers].sort(() => Math.random() - 0.5).slice(0, reactionCount);
    const post = await PostModel.create({
      author: p.author._id,
      content: p.content,
      images: p.images,
      privacy: 'public',
      reactions: reactors.map((u) => ({ userId: u._id, type: reactionTypes[Math.floor(Math.random() * reactionTypes.length)] })),
      createdAt: daysAgo(Math.floor(Math.random() * 20)),
    });
    posts.push(post);
  }

  console.log('Tạo bình luận...');
  const commentTexts = ['Hay quá!', 'Đẹp quá bạn ơi 😍', 'Chúc mừng nhé!', 'Cho mình xin info với', 'Haha đúng r đó', 'Xuất sắc!'];
  for (const post of posts.slice(0, 8)) {
    const commenter = users[Math.floor(Math.random() * users.length)];
    const comment = await CommentModel.create({
      post: post._id,
      author: commenter._id,
      content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
      createdAt: daysAgo(Math.floor(Math.random() * 10)),
    });
    await PostModel.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });
    void comment;
  }

  console.log('Tạo story...');
  const storyUsers = [bao, cam, ha, khoa, linh];
  await StoryModel.insertMany(
    storyUsers.map((u, i) => ({
      user: u._id,
      type: 'image' as const,
      mediaUrl: PHOTO(`story-${u.username}`, 720, 1280),
      expiresAt: new Date(Date.now() + (24 - i * 2) * 60 * 60 * 1000),
      createdAt: hoursAgo(i * 2),
    }))
  );

  console.log('Tạo hội thoại & tin nhắn...');
  const convoPairs: [any, any, string[]][] = [
    [bao, cam, ['Chào Cẩm, dạo này khoẻ không?', 'Mình khoẻ, cảm ơn Bảo nhé!', 'Cuối tuần đi cà phê không?', 'Ok luôn, mấy giờ vậy?']],
    [duy, phuc, ['Anh ơi cho em hỏi về deploy với ạ', 'Ừ em cứ hỏi', 'Sao build bị lỗi esbuild anh nhỉ?', 'Để anh xem log giúp em']],
    [ha, linh, ['Quán bún chả hôm trước ở đâu vậy?', 'Để mình gửi địa chỉ cho', 'Cảm ơn Linh nhiều nha 🥰']],
  ];

  for (const [userA, userB, messages] of convoPairs) {
    const convo = await ConversationModel.create({
      isGroup: false,
      participants: [userA._id, userB._id],
      updatedAt: hoursAgo(1),
    });
    for (let i = 0; i < messages.length; i++) {
      const sender = i % 2 === 0 ? userA : userB;
      await MessageModel.create({
        conversation: convo._id,
        sender: sender._id,
        kind: 'text',
        content: messages[i],
        readBy: [sender._id],
        createdAt: hoursAgo(messages.length - i),
      });
    }
  }

  console.log('Tạo thông báo...');
  await NotificationModel.insertMany([
    { user: bao._id, actor: cam._id, type: 'like', content: 'đã thích bài viết của bạn', targetType: 'post', targetId: String(posts[0]._id), createdAt: hoursAgo(2) },
    { user: duy._id, actor: bao._id, type: 'friend_accept', content: 'đã chấp nhận lời mời kết bạn', targetType: 'profile', targetId: String(duy._id), createdAt: hoursAgo(5) },
    { user: bao._id, actor: linh._id, type: 'friend_request', content: 'đã gửi lời mời kết bạn', targetType: 'profile', targetId: String(linh._id), createdAt: hoursAgo(5) },
    { user: ha._id, actor: phuc._id, type: 'friend_request', content: 'đã gửi lời mời kết bạn', targetType: 'profile', targetId: String(phuc._id), createdAt: hoursAgo(20) },
    { user: cam._id, actor: duy._id, type: 'comment', content: 'đã bình luận về bài viết của bạn', targetType: 'post', targetId: String(posts[1]._id), createdAt: hoursAgo(8) },
  ]);

  console.log('Tạo báo cáo & thông báo hệ thống...');
  await ReportModel.insertMany([
    { reporter: ha._id, targetType: 'post', targetId: String(posts[2]._id), targetName: 'Bài viết của Phạm Đức Duy', reason: 'Nội dung spam', status: 'pending', createdAt: hoursAgo(10) },
    { reporter: bao._id, targetType: 'user', targetId: String(khoa._id), targetName: 'Vũ Anh Khoa', reason: 'Ngôn từ không phù hợp', status: 'pending', createdAt: hoursAgo(30) },
  ]);
  await AnnouncementModel.create({
    title: 'Chào mừng đến với Social Network App',
    message: 'Cảm ơn bạn đã tham gia! Hãy khám phá các tính năng đăng bài, kết bạn, nhắn tin và nhiều hơn nữa.',
    type: 'info',
    createdBy: admin._id,
  });

  console.log('\n✅ Seed demo hoàn tất!');
  console.log(`   - ${users.length} người dùng (mật khẩu chung: 123456)`);
  console.log(`   - ${posts.length} bài viết`);
  console.log(`   - ${groups.length} nhóm`);
  console.log(`   - Tài khoản admin: ${admin.email} / 123456`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
