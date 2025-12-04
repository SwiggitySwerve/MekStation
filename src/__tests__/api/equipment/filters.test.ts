/**
 * Tests for /api/equipment/filters endpoint
 */
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/equipment/filters';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EquipmentCategory } from '@/types/equipment';
import { parseSuccessResponse, parseErrorResponse, type FilterItem } from '../../helpers';

/**
 * Filters response data type
 */
interface FiltersData {
  categories: FilterItem[];
  techBases: FilterItem[];
  rulesLevels: FilterItem[];
}

describe('/api/equipment/filters', () => {
  describe('GET method validation', () => {
    it('should reject non-GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Method not allowed');
    });

    it('should reject PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('GET filter options', () => {
    it('should return all filter options', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const response = parseSuccessResponse<FiltersData>(res);
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.categories).toBeDefined();
      expect(response.data?.techBases).toBeDefined();
      expect(response.data?.rulesLevels).toBeDefined();
    });

    it('should include all equipment categories', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const response = parseSuccessResponse<FiltersData>(res);
      const categories = response.data?.categories ?? [];

      // Verify structure
      expect(categories).toBeInstanceOf(Array);
      expect(categories.length).toBeGreaterThan(0);

      // Each category should have value and label
      categories.forEach((cat) => {
        expect(cat).toHaveProperty('value');
        expect(cat).toHaveProperty('label');
        expect(typeof cat.value).toBe('string');
        expect(typeof cat.label).toBe('string');
      });

      // Verify all enum values are included
      const categoryValues = categories.map((c) => c.value);
      Object.values(EquipmentCategory).forEach((category) => {
        expect(categoryValues).toContain(category);
      });
    });

    it('should include all tech bases', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const response = parseSuccessResponse<FiltersData>(res);
      const techBases = response.data?.techBases ?? [];

      // Verify structure
      expect(techBases).toBeInstanceOf(Array);
      expect(techBases.length).toBeGreaterThan(0);

      // Each tech base should have value and label
      techBases.forEach((tb) => {
        expect(tb).toHaveProperty('value');
        expect(tb).toHaveProperty('label');
      });

      // Verify all enum values are included
      const techBaseValues = techBases.map((t) => t.value);
      Object.values(TechBase).forEach((techBase) => {
        expect(techBaseValues).toContain(techBase);
      });
    });

    it('should include all rules levels', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const response = parseSuccessResponse<FiltersData>(res);
      const rulesLevels = response.data?.rulesLevels ?? [];

      // Verify structure
      expect(rulesLevels).toBeInstanceOf(Array);
      expect(rulesLevels.length).toBeGreaterThan(0);

      // Each rules level should have value and label
      rulesLevels.forEach((rl) => {
        expect(rl).toHaveProperty('value');
        expect(rl).toHaveProperty('label');
      });

      // Verify all enum values are included
      const rulesLevelValues = rulesLevels.map((r) => r.value);
      Object.values(RulesLevel).forEach((rulesLevel) => {
        expect(rulesLevelValues).toContain(rulesLevel);
      });
    });

    it('should format labels properly', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const response = parseSuccessResponse<FiltersData>(res);
      const techBases = response.data?.techBases ?? [];

      // Find INNER_SPHERE and check label formatting
      // Note: TechBase.INNER_SPHERE = 'Inner Sphere', formatLabel converts to 'Inner sphere'
      const innerSphere = techBases.find(
        (t) => t.value === TechBase.INNER_SPHERE
      );
      expect(innerSphere).toBeDefined();
      expect(innerSphere?.label).toBe('Inner sphere');

      // Find CLAN and check label formatting
      const clan = techBases.find(
        (t) => t.value === TechBase.CLAN
      );
      expect(clan).toBeDefined();
      expect(clan?.label).toBe('Clan');
    });
  });
});
