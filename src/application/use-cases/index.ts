import type { Deps } from '../deps';
import { createAdminUseCases } from './admin';
import { createAuthUseCases } from './auth';
import { createGroupUseCases } from './groups';
import { createNotificationUseCases } from './notifications';
import { createReminderUseCases } from './reminders';
import { createRequestUseCases } from './requests';
import { createUserUseCases } from './users';

export function createUseCases(deps: Deps) {
  return {
    auth: createAuthUseCases(deps),
    users: createUserUseCases(deps),
    requests: createRequestUseCases(deps),
    groups: createGroupUseCases(deps),
    notifications: createNotificationUseCases(deps),
    admin: createAdminUseCases(deps),
    reminders: createReminderUseCases(deps),
  };
}
export type UseCases = ReturnType<typeof createUseCases>;
