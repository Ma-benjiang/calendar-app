import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventManager } from '../src/events';

describe('EventManager', () => {
  let manager: EventManager;

  beforeEach(() => {
    manager = new EventManager();
  });

  describe('createEvent', () => {
    it('should create event with unique id', () => {
      const event1 = manager.createEvent({
        title: 'Event 1',
        startDate: new Date(),
        endDate: new Date()
      });
      const event2 = manager.createEvent({
        title: 'Event 2',
        startDate: new Date(),
        endDate: new Date()
      });

      expect(event1.id).not.toBe(event2.id);
      expect(event1.title).toBe('Event 1');
    });
  });

  describe('updateEvent', () => {
    it('should update existing event', () => {
      const event = manager.createEvent({
        title: 'Original',
        startDate: new Date(),
        endDate: new Date()
      });

      const updated = manager.updateEvent(event.id, { title: 'Updated' });
      expect(updated?.title).toBe('Updated');
    });

    it('should return null for non-existent event', () => {
      const result = manager.updateEvent('non-existent', { title: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteEvent', () => {
    it('should delete existing event', () => {
      const event = manager.createEvent({
        title: 'To Delete',
        startDate: new Date(),
        endDate: new Date()
      });

      expect(manager.getAllEvents().length).toBe(1);
      manager.deleteEvent(event.id);
      expect(manager.getAllEvents().length).toBe(0);
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on change', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.createEvent({
        title: 'Test',
        startDate: new Date(),
        endDate: new Date()
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
