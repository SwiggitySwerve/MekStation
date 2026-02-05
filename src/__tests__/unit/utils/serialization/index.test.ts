import * as serializationUtils from '@/utils/serialization';
import * as dataIntegrity from '@/utils/serialization/DataIntegrityValidator';
import * as unitSerializer from '@/utils/serialization/UnitSerializer';

describe('utils/serialization/index', () => {
  it('should re-export unit serializer API', () => {
    expect(serializationUtils.serializeUnit).toBe(unitSerializer.serializeUnit);
    expect(serializationUtils.validateSerializedFormat).toBe(
      unitSerializer.validateSerializedFormat,
    );
    expect(serializationUtils.getSerializedFormatVersion).toBe(
      unitSerializer.getSerializedFormatVersion,
    );
    expect(serializationUtils.isFormatVersionSupported).toBe(
      unitSerializer.isFormatVersionSupported,
    );
    expect(serializationUtils.createUnitSerializer).toBe(
      unitSerializer.createUnitSerializer,
    );
  });

  it('should re-export data integrity validators', () => {
    expect(serializationUtils.checkEquipmentReferences).toBe(
      dataIntegrity.checkEquipmentReferences,
    );
    expect(serializationUtils.checkWeightConsistency).toBe(
      dataIntegrity.checkWeightConsistency,
    );
    expect(serializationUtils.checkArmorConsistency).toBe(
      dataIntegrity.checkArmorConsistency,
    );
    expect(serializationUtils.checkRequiredFields).toBe(
      dataIntegrity.checkRequiredFields,
    );
    expect(serializationUtils.validateDataIntegrity).toBe(
      dataIntegrity.validateDataIntegrity,
    );
  });
});
