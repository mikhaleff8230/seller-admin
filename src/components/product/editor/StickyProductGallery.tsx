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

type MediaThumb = {
  key: string;
  type: 'image' | 'video';
  data: any;
};

const imageSource = (image: any) =>
  image?.thumbnail || image?.url || image?.original || '';

const imageKey = (image: any) =>
  `image:${image?.id || imageSource(image)}`;

const videoKey = (video: any) => `video:${video?.id}`;

const videoPoster = (video: any) =>
  video?.thumbnail_url || video?.poster_url || '';

const videoSource = (video: any) =>
  video?.preview_url || video?.video_url || video?.url || '';

function SortableThumb({
  item,
  index,
  onSelect,
  active,
}: {
  item: MediaThumb;
  index: number;
  onSelect: () => void;
  active: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.key });
  const src = item.type === 'video' ? videoPoster(item.data) : imageSource(item.data);

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
      {src ? (
        <img
          src={src}
          alt={item.type === 'video' ? 'Видео' : `Фото ${index + 1}`}
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : null}
      {item.type === 'video' ? (
        <span
          aria-label="Видео"
          style={{
            alignItems: 'center',
            background: 'rgba(0,0,0,.62)',
            borderRadius: 999,
            color: '#fff',
            display: 'flex',
            fontSize: 12,
            height: 26,
            justifyContent: 'center',
            left: '50%',
            position: 'absolute',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 26,
          }}
        >
          ▶
        </span>
      ) : null}
    </button>
  );
}

export default function StickyProductGallery() {
  const { control, watch, setValue } = useFormContext<ProductEditorFormData>();
  const image = watch('image');
  const gallery = watch('gallery');
  const videos = watch('videos');
  const mediaOrder = watch('media_order');
  const videoAsCover = Boolean(watch('video_as_cover'));
  const galleryArray = Array.isArray(gallery) ? gallery : [];
  const videosArray = Array.isArray(videos) ? videos : [];
  const orderArray = Array.isArray(mediaOrder) ? mediaOrder : [];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!Array.isArray(gallery)) {
      setValue('gallery', []);
    }
    if (!Array.isArray(mediaOrder)) {
      setValue('media_order', []);
    }
  }, [gallery, mediaOrder, setValue]);

  const mediaItems = useMemo<MediaThumb[]>(() => {
    const items: MediaThumb[] = [];
    const usedImages = new Set<string>();

    [image, ...galleryArray].forEach((entry) => {
      const src = imageSource(entry);
      if (!src) return;
      const key = imageKey(entry);
      if (usedImages.has(key)) return;
      usedImages.add(key);
      items.push({ key, type: 'image', data: entry });
    });

    if (!videoAsCover) {
      videosArray.forEach((video) => {
        if (!video?.id || !videoSource(video)) return;
        items.push({ key: videoKey(video), type: 'video', data: video });
      });
    }

    return items;
  }, [image, galleryArray, videosArray, videoAsCover]);

  const orderedItems = useMemo(() => {
    const byKey = new Map(mediaItems.map((item) => [item.key, item]));
    const ordered = orderArray
      .map((key) => byKey.get(key))
      .filter((item): item is MediaThumb => Boolean(item));
    const present = new Set(ordered.map((item) => item.key));
    mediaItems.forEach((item) => {
      if (!present.has(item.key)) ordered.push(item);
    });
    return ordered;
  }, [mediaItems, orderArray]);

  useEffect(() => {
    const normalizedOrder = orderedItems.map((item) => item.key);
    if (normalizedOrder.join('|') !== orderArray.join('|')) {
      setValue('media_order', normalizedOrder, { shouldDirty: false });
    }
  }, [orderedItems, orderArray, setValue]);

  useEffect(() => {
    if (activeIndex >= orderedItems.length) {
      setActiveIndex(0);
    }
  }, [orderedItems.length, activeIndex]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = orderedItems.findIndex((item) => item.key === active.id);
    const newIndex = orderedItems.findIndex((item) => item.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(orderedItems, oldIndex, newIndex);
    const orderedImages = reordered
      .filter((item) => item.type === 'image')
      .map((item) => item.data);

    setValue('media_order', reordered.map((item) => item.key), {
      shouldDirty: true,
    });
    setValue('image', orderedImages[0] || null, { shouldDirty: true });
    setValue('gallery', orderedImages.slice(1), { shouldDirty: true });
    setActiveIndex(newIndex);
  };

  const current = orderedItems[activeIndex];

  return (
    <div className="wb-product-gallery wb-sticky wb-card">
      <div className="wb-gallery-main">
        {current?.type === 'video' ? (
          <video
            src={videoSource(current.data)}
            poster={videoPoster(current.data) || undefined}
            muted
            playsInline
            controls
            preload="metadata"
            style={{ height: '100%', objectFit: 'cover', width: '100%' }}
          />
        ) : current ? (
          <img src={imageSource(current.data)} alt="Превью товара" />
        ) : (
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>Добавьте фото</span>
        )}
      </div>

      {orderedItems.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedItems.map((item) => item.key)}
            strategy={rectSortingStrategy}
          >
            <div className="wb-gallery-thumbs">
              {orderedItems.map((item, index) => (
                <SortableThumb
                  key={item.key}
                  item={item}
                  index={index}
                  active={index === activeIndex}
                  onSelect={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}

      <div className="wb-upload-row">
        <p style={{ fontSize: 12, color: '#8c8c8c', margin: 0 }}>
          Главное фото, галерея и видео. Перетащите миниатюры для порядка.
        </p>
        <FileInput name="image" control={control} multiple={false} maxSize={5 * 1024 * 1024} />
        <FileInput name="gallery" control={control} maxSize={5 * 1024 * 1024} />
      </div>
    </div>
  );
}
