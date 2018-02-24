const Post = require('models/post');
const { ObjectId } = require('mongoose').Types;

const Joi = require('joi');
const posts = [
  {
    id: 1,
    title: '제목',
    body: '내용'
  }
];

exports.checkObjectId = (ctx, next) => {
  const { id } = ctx.params;

  // 검증 실패
  if (!ObjectId.isValid(id)) {
    ctx.status = 400; // 400 Bad Request
    return null;
  }

  return next(); // next 를 리턴해주어야 ctx.body 가 제대로 설정됩니다.
};

/*
 POST /api/posts
 { title, body, tags }
 */
exports.write = async (ctx) => {
  // 객체가 지닌 값들을 검증합니다.
  const schema = Joi.object().keys({
    title: Joi.string().required(), // 뒤에 required 를 붙여주면 필수 항목이라는 의미
    body: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).required() // 문자열 배열
  });

  // 첫번째 파라미터는 검증할 객체, 두번째는 스키마
  const result = Joi.validate(ctx.request.body, schema);

  // 에러 발생 시 에러내용 응답
  if (result.error) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  const { title, body, tags } = ctx.request.body;

  // 새 Post 인스턴스를 생성합니다.
  const post = new Post({
    title, body, tags
  });

  try {
    await post.save(); // 데이터베이스에 등록합니다.
    ctx.body = post; // 저장된 결과를 반환합니다.
  } catch (e) {
    // 데이터베이스의 오류 발생
    ctx.throw(e, 500);
  }
};

/*
 GET /api/posts/:id
 */
exports.read = async (ctx) => {
  const { id } = ctx.params;
  try {
    const post = await Post.findById(id).exec();
    // 포스트가 존재하지 않음
    if (!post) {
      ctx.status = 404;
      return;
    }
    ctx.body = post;
  } catch (e) {
    ctx.throw(e, 500);
  }
};

/*
 DELETE /api/posts/:id
 */
exports.remove = async (ctx) => {
  const { id } = ctx.params;
  try {
    await Post.findByIdAndRemove(id).exec();
    ctx.status = 204;
  } catch (e) {
    ctx.throw(e, 500);
  }
};

/*
 PATCH /api/posts/:id
 { title, body, tags }
 */
exports.update = async (ctx) => {
  const { id } = ctx.params;
  try {
    const post = await Post.findByIdAndUpdate(id, ctx.request.body, {
      new: true
      // 이 값을 설정해 주어야 업데이트 된 객체를 반환합니다.
      // 설정하지 않으면 업데이트되기 전의 객체를 반환합니다.
    }).exec();
    // 포스트가 존재하지 않을 시
    if (!post) {
      ctx.status = 404;
      return;
    }
    ctx.body = post;
  } catch (e) {
    ctx.throw(e, 500);
  }
};

/*
 GET /api/posts
 */
exports.list = async (ctx) => {
  // page 가 주어지지 않았다면 1로 간주
  // query 는 문자열 형태로 받아오므로 숫자로 변환
  const page = parseInt(ctx.query.page || 1, 10);
  const { tag } = ctx.query;

  const query = tag ? {
    tags: tag // tags 배열에 tag 를 가진 포스트 찾기
  } : {};

  // 잘못된 페이지가 주어졌다면 에러
  if (page < 1) {
    ctx.status = 400;
    return;
  }

  try {
    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(10)
      .skip((page - 1) * 10)
      .exec();

    // 마지막 페이지 알려주기
    // ctx.set 은 response header 를 설정해줍니다.
    const postCount = await Post.count(query).exec();
    ctx.set('Last-Page', Math.ceil(postCount / 10));
    ctx.body = posts;
  } catch (e) {
    ctx.throw(e, 500);
  }
};

exports.checkLogin = (ctx, next) => {
  if (!ctx.session.logged) {
    ctx.status = 401; // Unauthorized
    return null;
  }
  return next();
};