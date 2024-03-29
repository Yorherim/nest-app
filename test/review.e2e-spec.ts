import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Types, disconnect } from 'mongoose';

import { CreateReviewDto } from '../src/review/dto/create-review.dto';
import { CommonErrorMessages, ReviewErrorMessages } from '../src/errors/errors-messages';
import { MockAppModule } from './mock-app.module';
import { AuthDto } from '../src/auth/dto/auth.dto';

describe('ReviewController (e2e)', () => {
	let app: INestApplication;
	let createdId: string;
	let token: string;

	const productId = new Types.ObjectId().toHexString();
	const testCreateDto: CreateReviewDto = {
		authorName: 'name author',
		description: 'description review',
		rating: 5,
		title: 'title review',
		productId,
	};
	const newUser: AuthDto = { email: 'token@mail.ru', password: 'givetoken' };
	const fakeID = new Types.ObjectId().toHexString();

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [MockAppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();

		const {
			body: { access_token },
		} = await request(app.getHttpServer()).post('/auth/login').send(newUser);

		if (!access_token) {
			await request(app.getHttpServer()).post('/auth/register').send(newUser).expect(201);
			const {
				body: { access_token },
			} = await request(app.getHttpServer()).post('/auth/login').send(newUser).expect(200);
			token = access_token;
		} else {
			token = access_token;
		}
	});

	afterAll(() => disconnect());

	describe('/review/create (POST)', () => {
		it('success - create review', async () => {
			return request(app.getHttpServer())
				.post('/review/create')
				.send(testCreateDto)
				.expect(201)
				.then(({ body }: request.Response) => {
					createdId = body._id;
					expect(createdId).toBeDefined();
				});
		});

		it('fail - validation error: author name too short', async () => {
			return request(app.getHttpServer())
				.post('/review/create')
				.send({ ...testCreateDto, authorName: 'a' })
				.expect(400)
				.then(({ body }: request.Response) => {
					expect(body.message[0]).toBe(ReviewErrorMessages.AUTHOR_NAME_LONG);
				});
		});

		it('fail - validation error: author name too long', async () => {
			return request(app.getHttpServer())
				.post('/review/create')
				.send({ ...testCreateDto, authorName: 'afghgfhgfhfghdfghdfhdgfhdgfhghfg' })
				.expect(400)
				.then(({ body }: request.Response) => {
					expect(body.message[0]).toBe(ReviewErrorMessages.AUTHOR_NAME_LONG);
				});
		});

		it('fail - validation error: description too short', async () => {
			return request(app.getHttpServer())
				.post('/review/create')
				.send({ ...testCreateDto, description: 'a' })
				.expect(400)
				.then(({ body }: request.Response) => {
					expect(body.message[0]).toBe(ReviewErrorMessages.DESCRIPTION_LONG);
				});
		});

		it('fail - validation error: description too long', async () => {
			return request(app.getHttpServer())
				.post('/review/create')
				.send({
					...testCreateDto,
					description:
						'авпавпвапавпавпавпвапвапававва' +
						'вапвапваппарпарвпараправпавпва' +
						'павпавпавпвапвапававвавапвапва' +
						'ппарпарвпараправпавпвапавпавпа' +
						'впвапвапававвавапвапваппарпарв' +
						'параправпавпвапавпавпавпвапвапававвавапвапваппарпарвпарапр',
				})
				.expect(400)
				.then(({ body }: request.Response) => {
					expect(body.message[0]).toBe(ReviewErrorMessages.DESCRIPTION_LONG);
				});
		});

		it('fail - validation error: rating count less than 1', async () => {
			return request(app.getHttpServer())
				.post('/review/create')
				.send({ ...testCreateDto, rating: 0 })
				.expect(400)
				.then(({ body }: request.Response) => {
					expect(body.message[0]).toBe(ReviewErrorMessages.RATING_COUNT);
				});
		});

		it('fail - validation error: rating count less than 1', async () => {
			return request(app.getHttpServer())
				.post('/review/create')
				.send({ ...testCreateDto, rating: 6 })
				.expect(400)
				.then(({ body }: request.Response) => {
					expect(body.message[0]).toBe(ReviewErrorMessages.RATING_COUNT);
				});
		});
	});

	describe('/review/byProduct/:productId (GET)', () => {
		it('success - delete reviews by product id', async () => {
			return request(app.getHttpServer())
				.get(`/review/byProduct/${productId}`)
				.set('Authorization', 'Bearer ' + token)
				.expect(200)
				.then(({ body }: request.Response) => {
					expect(body).toHaveLength(1);
				});
		});

		it('fail - get reviews by fake id', async () => {
			return request(app.getHttpServer())
				.get(`/review/byProduct/${fakeID}`)
				.set('Authorization', 'Bearer ' + token)
				.expect(404, {
					statusCode: 404,
					message: ReviewErrorMessages.PRODUCT_ID_NOT_FOUND,
				});
		});

		it('fail - get reviews by ivalid id', async () => {
			return request(app.getHttpServer())
				.get(`/review/byProduct/1`)
				.set('Authorization', 'Bearer ' + token)
				.expect(400, {
					statusCode: 400,
					message: CommonErrorMessages.ID_VALIDATION_ERROR,
				});
		});

		it('success - guard token', async () => {
			return request(app.getHttpServer())
				.get(`/review/byProduct/${fakeID}`)
				.set('Authorization', 'Bearer ' + token)
				.expect(404, {
					statusCode: 404,
					message: ReviewErrorMessages.PRODUCT_ID_NOT_FOUND,
				});
		});

		it('fail - guard token', async () => {
			return request(app.getHttpServer())
				.get(`/review/byProduct/${fakeID}`)
				.set('Authorization', 'Bearer ' + 'invalid token')
				.expect(401, {
					statusCode: 401,
					message: 'Unauthorized',
				});
		});
	});

	describe('/review/:id (DELETE)', () => {
		it('success', () => {
			return request(app.getHttpServer())
				.delete('/review/' + createdId)
				.set('Authorization', 'Bearer ' + token)
				.expect(200);
		});

		it('fail - fake id', () => {
			return request(app.getHttpServer())
				.delete(`/review/${fakeID}`)
				.set('Authorization', 'Bearer ' + token)
				.expect(404, {
					statusCode: 404,
					message: ReviewErrorMessages.REVIEW_NOT_FOUND,
				});
		});

		it('fail - invalid id', () => {
			return request(app.getHttpServer())
				.delete(`/review/$1`)
				.set('Authorization', 'Bearer ' + token)
				.expect(400, {
					statusCode: 400,
					message: CommonErrorMessages.ID_VALIDATION_ERROR,
				});
		});
	});

	describe('/byProduct/:productId (DELETE)', () => {
		it('success - delete reviews by product id', async () => {
			await request(app.getHttpServer())
				.post('/review/create')
				.send(testCreateDto)
				.expect(201);
			await request(app.getHttpServer())
				.post('/review/create')
				.send({ ...testCreateDto, authorName: 'test 2' })
				.expect(201);

			return request(app.getHttpServer())
				.delete(`/review/byProduct/${productId}`)
				.set('Authorization', 'Bearer ' + token)
				.expect(200);
		});

		it('fail - fake id', () => {
			return request(app.getHttpServer())
				.delete(`/review/byProduct/${fakeID}`)
				.set('Authorization', 'Bearer ' + token)
				.expect(404, {
					statusCode: 404,
					message: ReviewErrorMessages.PRODUCT_ID_NOT_FOUND,
				});
		});

		it('fail - invalid id', () => {
			return request(app.getHttpServer())
				.delete(`/review/byProduct/1`)
				.set('Authorization', 'Bearer ' + token)
				.expect(400, {
					statusCode: 400,
					message: CommonErrorMessages.ID_VALIDATION_ERROR,
				});
		});
	});
});
