import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import {
  ProfileService,
  emptyProfile,
} from '../src/profile/profile.service.js';
import { JobsService } from '../src/jobs/jobs.service.js';
import { ApplicationsService } from '../src/applications/applications.service.js';
import { ProfileExtractorClient } from '../src/profile/profile-extractor.client.js';
import { DashboardService } from '../src/dashboard/dashboard.service.js';

const job = {
  id: '47b6e9b2-36bd-469c-aa50-222222222222',
  role: 'Engineer',
  company: 'Acme',
  location: 'Remote',
  status: 'confirmed',
  trackingStatus: 'saved',
  requirements: [],
};
const application = {
  id: '47b6e9b2-36bd-469c-aa50-333333333333',
  jobId: job.id,
  stage: 'applied',
};

describe('web API routes', () => {
  let app: INestApplication;
  const profile = {
    get: vi.fn().mockResolvedValue(emptyProfile),
    save: vi.fn().mockResolvedValue(emptyProfile),
    reset: vi.fn().mockResolvedValue(emptyProfile),
  };
  const jobs = {
    list: vi.fn().mockResolvedValue([job]),
    get: vi.fn().mockResolvedValue(job),
    analyze: vi.fn().mockResolvedValue(job),
    confirm: vi.fn().mockResolvedValue(job),
    update: vi.fn().mockResolvedValue(job),
    match: vi.fn().mockResolvedValue({
      state: 'ready',
      strongMatches: [],
      partialMatches: [],
      missingSkills: [],
      eligibilityGaps: [],
    }),
  };
  const applications = {
    list: vi.fn().mockResolvedValue([application]),
    get: vi.fn().mockResolvedValue(application),
    forJob: vi.fn().mockResolvedValue(null),
    source: vi.fn().mockResolvedValue(job),
    create: vi.fn().mockResolvedValue(application),
    update: vi.fn().mockResolvedValue(application),
  };
  const extractor = {
    extract: vi.fn().mockResolvedValue({
      currentRole: 'Product Designer',
      experience: [],
      skills: [],
      education: [],
      certifications: [],
      languages: [],
      interests: [],
      workModels: [],
      locations: [],
      salaryCurrency: '',
      salaryMinimum: '',
      salaryTarget: '',
    }),
  };
  const dashboard = {
    get: vi.fn().mockResolvedValue({
      profileReady: false,
      activeApplicationCount: 0,
      savedOpportunityCount: 0,
      upcomingInterviewCount: 0,
      analyzedOpportunityCount: 0,
      activeApplications: [],
      upcomingInterviews: [],
      bestAlignedOpportunities: [],
      recurringGaps: [],
      focus: {
        kind: 'link',
        title: 'Complete your Career Profile',
        description: '',
        href: '/profile',
      },
    }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(ProfileService)
      .useValue(profile)
      .overrideProvider(ProfileExtractorClient)
      .useValue(extractor)
      .overrideProvider(JobsService)
      .useValue(jobs)
      .overrideProvider(ApplicationsService)
      .useValue(applications)
      .overrideProvider(DashboardService)
      .useValue(dashboard)
      .compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
  });
  afterAll(() => app.close());
  it('serves the dashboard summary at the web app URL', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/dashboard')
      .expect(200);
    expect(response.body).toEqual(await dashboard.get());
  });
  it('serves profile routes', async () => {
    await request(app.getHttpServer()).get('/api/profile').expect(200);
    await request(app.getHttpServer())
      .put('/api/profile')
      .send(emptyProfile)
      .expect(200);
    await request(app.getHttpServer()).post('/api/profile/reset').expect(201);
    await request(app.getHttpServer()).post('/api/profile/import').expect(400);
    await request(app.getHttpServer())
      .post('/api/profile/import')
      .attach(
        'file',
        readFileSync('test/fixtures/sample-cv.docx'),
        'sample-cv.docx',
      )
      .expect(201);
    expect(profile.save).toHaveBeenCalledWith(
      expect.objectContaining({
        currentRole: 'Product Designer',
        source: 'cv',
      }),
    );
    expect(extractor.extract).toHaveBeenCalledWith(
      expect.stringContaining('Product Designer'),
    );
  });
  it('rejects invalid AI output without saving it', async () => {
    const callsBefore = profile.save.mock.calls.length;
    extractor.extract.mockResolvedValueOnce({
      currentRole: 'Designer',
      skills: null,
    });
    await request(app.getHttpServer())
      .post('/api/profile/import')
      .attach(
        'file',
        readFileSync('test/fixtures/sample-cv.docx'),
        'sample-cv.docx',
      )
      .expect(503);
    expect(profile.save.mock.calls.length).toBe(callsBefore);
  });
  it('serves job routes', async () => {
    await request(app.getHttpServer()).get('/api/jobs').expect(200);
    await request(app.getHttpServer())
      .post('/api/jobs/analyze')
      .send({ url: '', description: 'x'.repeat(100) })
      .expect(201);
    await request(app.getHttpServer()).get(`/api/jobs/${job.id}`).expect(200);
    await request(app.getHttpServer())
      .get(`/api/jobs/${job.id}/match`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/jobs/${job.id}/confirm`)
      .send(job)
      .expect(201);
    await request(app.getHttpServer())
      .put(`/api/jobs/${job.id}`)
      .send({ notes: '', trackingStatus: 'saved' })
      .expect(200);
    await request(app.getHttpServer()).get('/api/jobs/invalid').expect(400);
  });
  it('serves application routes', async () => {
    await request(app.getHttpServer()).get('/api/applications').expect(200);
    await request(app.getHttpServer())
      .get(`/api/applications/${application.id}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/applications/by-job/${job.id}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/applications/source/${job.id}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/applications')
      .send({ jobId: job.id, appliedOn: '2026-10-02' })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/api/applications/${application.id}`)
      .send({
        stage: 'applied',
        appliedOn: '2026-10-02',
        notes: '',
        importantDates: [],
        interviews: [],
      })
      .expect(200);
  });
});
