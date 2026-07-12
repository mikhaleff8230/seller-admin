import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import FileInput from '@/components/ui/file-input';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';

function SortableThumb({
  img,
  index,
  onSelect,
  active,
}: {
  img: any;
  index: number;
  onSelect: () => void;
  active: boolean;
}) {
  const id = img.id || img.thumbnail || img.url || img.original || `g-${index}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        outline: active ? '2px solid #a73afd' : undefined,
      }}
      className="wb-gallery-thumb"
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <img
        src={img.thumbnail || img.url || img.original}
        alt={`Фото ${index + 1}`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </button>
  );
}

export default function StickyProductGallery() {
  const { control, watch, setValue } = useFormContext<ProductEditorFormData>();
  const image = watch('image');
  const gallery = watch('gallery');
  const galleryArray = Array.isArray(gallery) ? gallery : [];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (gallery === undefined || gallery === null || !Array.isArray(gallery)) {
      setValue('gallery', []);
    }
  }, []);

  const previewItems = useMemo(() => {
    const items: any[] = [];
    if (image && (image.thumbnail || image.url || image.original)) {
      items.push(image);
    }
    galleryArray.forEach((g) => {
      const src = g?.thumbnail || g?.url || g?.original;
      const mainSrc = image?.thumbnail || image?.url || image?.original;
      if (src && src !== mainSrc) items.push(g);
    });
    return items;
  }, [image, galleryArray]);

  useEffect(() => {
    if (activeIndex >= previewItems.length) {
      setActiveIndex(0);
    }
  }, [previewItems.length, activeIndex]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || galleryArray.length === 0) return;

    const oldIndex = galleryArray.findIndex(
      (img: any) => (img.id || img.thumbnail || img.url || img.original) === active.id
    );
    const newIndex = galleryArray.findIndex(
      (img: any) => (img.id || img.thumbnail || img.url || img.original) === over.id
    );
    if (oldIndex !== -1 && newIndex !== -1) {
      setValue('gallery', arrayMove(galleryArray, oldIndex, newIndex));
    }
  };

  const galleryIds = galleryArray.map(
    (img: any, index: number) =>
      img.id || img.thumbnail || img.url || img.original || `gallery-${index}`
  );

  const current = previewItems[activeIndex];
  const currentSrc = current?.thumbnail || current?.url || current?.original;

  return (
    <div className="wb-sticky wb-card">
      <div className="wb-gallery-main">
        {currentSrc ? (
          <img src={currentSrc} alt="Превью товара" />
        ) : (
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>Добавьте фото</span>
        )}
      </div>

      {galleryArray.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={galleryIds} strategy={rectSortingStrategy}>
            <div className="wb-gallery-thumbs">
              {galleryArray.map((img: any, index: number) => (
                <SortableThumb
                  key={img.id || img.thumbnail || img.url || img.original || index}
                  img={img}
                  index={index}
                  active={
                    (img.thumbnail || img.url || img.original) === currentSrc
                  }
                  onSelect={() => {
                    const idx = previewItems.findIndex(
                      (p) =>
                        (p.thumbnail || p.url || p.original) ===
                        (img.thumbnail || img.url || img.original)
                    );
                    setActiveIndex(idx >= 0 ? idx : 0);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="wb-upload-row">
        <p style={{ fontSize: 12, color: '#8c8c8c', margin: 0 }}>
          Главное фото и галерея. Перетащите миниатюры для порядка.
        </p>
        <FileInput name="image" control={control} multiple={false} maxSize={5 * 1024 * 1024} />
        <FileInput name="gallery" control={control} maxSize={5 * 1024 * 1024} />
      </div>
    </div>
  );
}
