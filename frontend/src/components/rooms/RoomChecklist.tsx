// frontend/src/components/rooms/RoomChecklist.tsx
import React from 'react';
import { useProjectStore, type Room } from '../../stores/projectStore';
import { rooms as roomsApi } from '../../api/rooms';
import './RoomChecklist.css';

export function RoomChecklist() {
  const project = useProjectStore((s) => s.project);
  const activeRoomId = useProjectStore((s) => s.activeRoomId);
  const setActiveRoom = useProjectStore((s) => s.setActiveRoom);
  const updateRoom = useProjectStore((s) => s.updateRoom);

  if (!project) return null;

  async function toggleRoom(room: Room) {
    if (!project) return;
    const updated = { isSelected: !room.isSelected };
    updateRoom(room.id, updated);
    try {
      await roomsApi.update(project.id, room.id, { isSelected: !room.isSelected });
    } catch {
      updateRoom(room.id, { isSelected: room.isSelected }); // rollback
    }
  }

  return (
    <div className="room-checklist">
      <p className="room-checklist__hint">
        Select rooms to decorate. Click a room to edit it.
      </p>
      <ul className="room-checklist__list">
        {project.rooms.map((room) => (
          <li key={room.id}>
            <div
              className={`room-item ${activeRoomId === room.id ? 'room-item--active' : ''}`}
              onClick={() => setActiveRoom(room.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActiveRoom(room.id)}
            >
              <input
                type="checkbox"
                className="room-item__checkbox"
                checked={room.isSelected}
                onChange={() => toggleRoom(room)}
                onClick={(e) => e.stopPropagation()}
                id={`room-${room.id}`}
                aria-label={`Include ${room.label}`}
              />
              <div className="room-item__info">
                <label className="room-item__label" htmlFor={`room-${room.id}`} onClick={(e) => e.stopPropagation()}>
                  {room.label}
                </label>
                <span className="room-item__type">{room.roomType.replace('_', ' ')}</span>
              </div>
              {room.bboxWidthCm && room.bboxHeightCm ? (
                <span className="room-item__dims">
                  {Math.round(room.bboxWidthCm / 30.48)}×{Math.round(room.bboxHeightCm / 30.48)}ft
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
