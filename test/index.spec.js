import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('RSVP2GO Application Tests', () => {
  // Helper function to create a request
  const createTestRequest = (path = '/', method = 'GET', formData = null) => {
    const url = `http://example.com${path}`;
    const options = { method };
    if (formData) {
      options.body = formData;
    }
    return new Request(url, options);
  };

  describe('Homepage', () => {
    it('should render the homepage correctly', async () => {
      const request = createTestRequest();
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      
      const text = await response.text();
      expect(text).toContain('A free event RSVP app');
      expect(text).toContain('Create Event');
      expect(text).toContain('Preview RSVPs');
      expect(text).toContain('Free · No personal details · Calendar integration');
    });
  });

  describe('Event Creation', () => {
    it('should create a new event successfully', async () => {
      const formData = new FormData();
      formData.append('name', 'Test Event');
      formData.append('date', '2024-12-31');
      formData.append('timezone', 'UTC');
      formData.append('description', 'Test Description');
      formData.append('creatorEmail', 'test@example.com');

      const request = createTestRequest('/create', 'POST', formData);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const data = await response.json();
      expect(data).toHaveProperty('eventId');
      expect(typeof data.eventId).toBe('string');
      expect(data.eventId.length).toBeGreaterThan(0);
    });

    it('should render the create event form', async () => {
      const request = createTestRequest('/create');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const text = await response.text();
      expect(text).toContain('Create Event');
      expect(text).toContain('What\'s the event?');
      expect(text).toContain('Time Zone');
      expect(text).toContain('Description');
    });
  });

  describe('RSVP Submission', () => {
    it('should handle RSVP submission correctly', async () => {
      const formData = new FormData();
      formData.append('eventId', 'test-event');
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');

      const request = createTestRequest('/rsvp', 'POST', formData);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('RSVP recorded');
    });

    it('should render RSVP form for valid event', async () => {
      // First create an event
      const eventFormData = new FormData();
      eventFormData.append('name', 'Test Event');
      eventFormData.append('date', '2024-12-31');
      eventFormData.append('timezone', 'UTC');
      eventFormData.append('description', 'Test Description');
      eventFormData.append('creatorEmail', 'test@example.com');

      const createReq = createTestRequest('/create', 'POST', eventFormData);
      const createCtx = createExecutionContext();
      const createResponse = await worker.fetch(createReq, env, createCtx);
      await waitOnExecutionContext(createCtx);
      const { eventId } = await createResponse.json();

      // Then test the RSVP form rendering
      const request = createTestRequest(`/?event=${eventId}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const text = await response.text();
      expect(text).toContain('Test Event');
      expect(text).toContain('Your Name');
      expect(text).toContain('Email');
    });
  });

  describe('Event Preview', () => {
    it('should show event preview form when no email provided', async () => {
      const request = createTestRequest('/preview');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const text = await response.text();
      expect(text).toContain('Preview Your Events');
      expect(text).toContain('Enter your email');
    });

    it('should show events for valid email', async () => {
      // First create an event
      const eventFormData = new FormData();
      eventFormData.append('name', 'Test Event');
      eventFormData.append('date', '2024-12-31');
      eventFormData.append('timezone', 'UTC');
      eventFormData.append('description', 'Test Description');
      eventFormData.append('creatorEmail', 'test@example.com');

      const createReq = createTestRequest('/create', 'POST', eventFormData);
      const createCtx = createExecutionContext();
      await worker.fetch(createReq, env, createCtx);
      await waitOnExecutionContext(createCtx);

      // Then test the preview with email
      const request = createTestRequest('/preview?email=test@example.com');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const text = await response.text();
      expect(text).toContain('Test Event');
      expect(text).toContain('2024-12-31');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const request = createTestRequest('/unknown-route');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Not found');
    });

    it('should return 404 for non-existent event', async () => {
      const request = createTestRequest('/?event=non-existent');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const text = await response.text();
      expect(text).toContain('Event Not Found');
      expect(text).toContain('This event doesn\'t exist or has expired');
    });
  });
});
