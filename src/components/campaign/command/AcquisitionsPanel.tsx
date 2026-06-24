import React, { useState } from 'react';

import type {
  IAcquisitionRequest,
  IShoppingList,
} from '@/types/campaign/acquisition/acquisitionTypes';
import type { IPartsInventoryItem } from '@/types/campaign/PartsInventory';

import { Button, Card, Input, Select } from '@/components/ui';
import { AvailabilityRating } from '@/types/campaign/acquisition/acquisitionTypes';

import { CommandEmpty } from './CommandStates';

interface AcquisitionFormValues {
  readonly partName: string;
  readonly quantity: number;
  readonly availability: AvailabilityRating;
  readonly isConsumable: boolean;
}

interface AcquisitionsPanelProps {
  readonly shoppingList: IShoppingList;
  readonly partsInventory: readonly IPartsInventoryItem[];
  readonly currentDate: Date;
  readonly onAddRequest: (values: AcquisitionFormValues) => void;
  readonly onRemoveRequest: (requestId: string) => void;
  readonly onAdvanceDay: () => void;
  readonly actionError?: string | null;
}

const availabilityOptions = Object.values(AvailabilityRating).map((value) => ({
  value,
  label: value,
}));

const statusToneByStatus: Record<IAcquisitionRequest['status'], string> = {
  delivered: 'bg-emerald-500/20 text-emerald-300',
  failed: 'bg-red-500/20 text-red-300',
  in_transit: 'bg-cyan-500/20 text-cyan-300',
  pending: 'bg-slate-500/20 text-slate-300',
  rolling: 'bg-amber-500/20 text-amber-300',
};

function formatDate(value?: string): string {
  if (!value) return 'Not set';
  return new Date(value).toISOString().slice(0, 10);
}

function statusTone(status: IAcquisitionRequest['status']): string {
  return statusToneByStatus[status] ?? statusToneByStatus.pending;
}

function AcquisitionRequestRow({
  onRemove,
  request,
}: {
  readonly request: IAcquisitionRequest;
  readonly onRemove: (requestId: string) => void;
}): React.ReactElement {
  return (
    <Card className="p-4" data-testid={`acquisition-request-${request.id}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-text-theme-primary font-semibold">
              {request.partName}
            </h3>
            <span
              className={`rounded px-2 py-1 text-xs font-semibold uppercase ${statusTone(
                request.status,
              )}`}
              data-testid={`acquisition-status-${request.id}`}
            >
              {request.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-text-theme-secondary mt-1 text-sm">
            Qty {request.quantity} - Availability {request.availability} -
            Attempts {request.attempts}
          </p>
          <p className="text-text-theme-secondary mt-1 text-xs">
            Ordered {formatDate(request.orderedDate)} - Delivery{' '}
            {formatDate(request.deliveryDate)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(request.id)}
          data-testid={`acquisition-remove-${request.id}`}
        >
          Remove
        </Button>
      </div>
    </Card>
  );
}

function InventoryRow({
  item,
}: {
  readonly item: IPartsInventoryItem;
}): React.ReactElement {
  return (
    <Card className="p-3" data-testid={`acquisition-inventory-${item.partId}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-text-theme-primary truncate text-sm font-semibold">
            {item.partName}
          </p>
          <p className="text-text-theme-secondary text-xs">
            {item.source} -{' '}
            {new Date(item.acquiredAt).toISOString().slice(0, 10)}
          </p>
        </div>
        <span
          className="text-text-theme-primary font-mono text-sm"
          data-testid={`acquisition-inventory-qty-${item.partId}`}
        >
          x{item.quantity}
        </span>
      </div>
    </Card>
  );
}

export function AcquisitionsPanel({
  actionError,
  currentDate,
  onAddRequest,
  onAdvanceDay,
  onRemoveRequest,
  partsInventory,
  shoppingList,
}: AcquisitionsPanelProps): React.ReactElement {
  const [partName, setPartName] = useState('Medium Laser');
  const [quantity, setQuantity] = useState('1');
  const [availability, setAvailability] = useState<AvailabilityRating>(
    AvailabilityRating.D,
  );
  const [isConsumable, setIsConsumable] = useState(false);

  const pending = shoppingList.items.filter(
    (item) => item.status === 'pending',
  );
  const inTransit = shoppingList.items.filter(
    (item) => item.status === 'in_transit',
  );
  const delivered = shoppingList.items.filter(
    (item) => item.status === 'delivered',
  );
  const acquisitionInventory = partsInventory.filter(
    (item) => item.source === 'acquisition',
  );

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    onAddRequest({
      partName,
      quantity: Number(quantity),
      availability,
      isConsumable,
    });
  };

  return (
    <div className="space-y-6" data-testid="acquisitions-panel">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4" data-testid="acquisitions-total">
          <p className="text-text-theme-secondary text-xs uppercase">Queue</p>
          <p className="text-text-theme-primary mt-1 text-2xl font-semibold">
            {shoppingList.items.length}
          </p>
        </Card>
        <Card className="p-4" data-testid="acquisitions-pending-count">
          <p className="text-text-theme-secondary text-xs uppercase">Pending</p>
          <p className="text-text-theme-primary mt-1 text-2xl font-semibold">
            {pending.length}
          </p>
        </Card>
        <Card className="p-4" data-testid="acquisitions-transit-count">
          <p className="text-text-theme-secondary text-xs uppercase">
            In transit
          </p>
          <p className="text-text-theme-primary mt-1 text-2xl font-semibold">
            {inTransit.length}
          </p>
        </Card>
        <Card className="p-4" data-testid="acquisitions-delivered-count">
          <p className="text-text-theme-secondary text-xs uppercase">
            Delivered
          </p>
          <p className="text-text-theme-primary mt-1 text-2xl font-semibold">
            {delivered.length}
          </p>
        </Card>
      </div>

      <Card className="p-4" data-testid="acquisition-request-form-card">
        <form
          className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_auto]"
          onSubmit={handleSubmit}
        >
          <Input
            label="Part"
            value={partName}
            onChange={(event) => setPartName(event.target.value)}
            data-testid="acquisition-part-name"
          />
          <Input
            label="Quantity"
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            data-testid="acquisition-quantity"
          />
          <Select
            label="Availability"
            options={availabilityOptions}
            value={availability}
            onChange={(event) =>
              setAvailability(event.target.value as AvailabilityRating)
            }
            data-testid="acquisition-availability"
          />
          <div className="flex flex-col justify-end gap-3">
            <label className="text-text-theme-secondary flex min-h-[44px] items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isConsumable}
                onChange={(event) => setIsConsumable(event.target.checked)}
                data-testid="acquisition-consumable"
              />
              Consumable
            </label>
            <Button
              type="submit"
              variant="primary"
              data-testid="acquisition-add-request"
            >
              Add
            </Button>
          </div>
        </form>
        {actionError ? (
          <p
            className="mt-3 text-sm text-red-400"
            data-testid="acquisition-error"
          >
            {actionError}
          </p>
        ) : null}
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-text-theme-secondary text-sm">
          Current campaign date:{' '}
          <span
            className="text-text-theme-primary font-mono"
            data-testid="acquisition-current-date"
          >
            {currentDate.toISOString().slice(0, 10)}
          </span>
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={onAdvanceDay}
          data-testid="acquisitions-advance-day"
        >
          Process next day
        </Button>
      </div>

      <section className="space-y-3" data-testid="acquisition-request-list">
        {shoppingList.items.length === 0 ? (
          <CommandEmpty
            title="No acquisition requests"
            message="Add parts to the shopping list before the acquisition processor runs."
          />
        ) : (
          shoppingList.items.map((request) => (
            <AcquisitionRequestRow
              key={request.id}
              request={request}
              onRemove={onRemoveRequest}
            />
          ))
        )}
      </section>

      <section className="space-y-3" data-testid="acquisition-inventory-list">
        <h2 className="text-text-theme-primary text-lg font-semibold">
          Delivered acquisition inventory
        </h2>
        {acquisitionInventory.length === 0 ? (
          <CommandEmpty
            title="No acquisition deliveries"
            message="Delivered acquisition parts appear here after the day processor materializes them."
          />
        ) : (
          acquisitionInventory.map((item) => (
            <InventoryRow key={item.inventoryId} item={item} />
          ))
        )}
      </section>
    </div>
  );
}
