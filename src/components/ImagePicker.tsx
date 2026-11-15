import { AspectRatio, Box, Button, Group, Input, Loader, Stack, Text } from '@mantine/core'
import { IconPhotoPlus } from '@tabler/icons-react'
import { type DragEvent, type ReactNode, useRef, useState } from 'react'
import { uploadImage } from '../api'
import { errorMessage } from '../lib/errors'
import { downscaleImage } from '../lib/image'
import type { UploadedImage } from '../types'

interface ImagePickerProps {
  /** 送り終わった写真。無ければ null */
  image: UploadedImage | null
  onChange: (image: UploadedImage | null) => void
  /** 写真があるときに、横に出す操作(「写真から入力する」など) */
  children?: ReactNode
}

const ACCEPT = 'image/jpeg,image/png,image/webp'
const PREVIEW_SIZE = 160

/**
 * 商品の写真を 1 枚選ぶ(クリックでも、ドラッグ&ドロップでも)。
 * 選んだらブラウザの中で小さくしてからサーバーに送り、返ってきた URL を親に渡す。
 * 見せるプレビューはサーバーに保存された画像そのもの(「見えているもの = 出品されるもの」にするため)。
 */
export function ImagePicker({ image, onChange, children }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const choose = () => inputRef.current?.click()

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!ACCEPT.split(',').includes(file.type)) {
      setError('JPEG・PNG・WebP の画像を選んでください')
      return
    }
    setError(null)
    setUploading(true)
    try {
      let small: Blob
      try {
        small = await downscaleImage(file)
      } catch {
        throw new Error('この画像は読み込めませんでした。別の写真でお試しください')
      }
      onChange(await uploadImage(small))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    if (!uploading) void handleFile(event.dataTransfer.files[0])
  }

  return (
    <Input.Wrapper
      label="商品の写真(任意)"
      description="写真が無くても出品できます(カテゴリのアイコンが表示されます)"
      error={error}
      // エラーは、読み上げソフトにもすぐ伝える
      errorProps={{ role: 'alert' }}
    >
      {/* 見えない file 入力。ボタンから開く。同じ写真を選び直せるように、選ぶたびに値を空に戻す */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        aria-label="商品の写真"
        hidden
        onChange={(event) => {
          void handleFile(event.currentTarget.files?.[0])
          event.currentTarget.value = ''
        }}
      />

      <Box mt={6} mb={error ? 6 : 0} mih={PREVIEW_SIZE}>
        {uploading ? (
          <Stack align="center" justify="center" gap="xs" mih={PREVIEW_SIZE} role="status">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              写真を小さくして送っています…
            </Text>
          </Stack>
        ) : image ? (
          <Group gap="md" align="flex-start" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
            <AspectRatio ratio={1} w={PREVIEW_SIZE} style={{ flexShrink: 0 }}>
              <img
                src={image.url}
                alt="選んだ写真"
                style={{ objectFit: 'cover', borderRadius: 'var(--mantine-radius-md)', display: 'block' }}
              />
            </AspectRatio>
            <Stack gap="xs" align="flex-start" style={{ flex: 1, minWidth: 180 }}>
              {children}
              <Group gap="xs">
                <Button variant="default" size="xs" onClick={choose}>
                  写真を変える
                </Button>
                <Button variant="subtle" color="gray" size="xs" onClick={() => onChange(null)}>
                  写真を外す
                </Button>
              </Group>
            </Stack>
          </Group>
        ) : (
          <button
            type="button"
            className="image-drop"
            data-dragging={dragging}
            onClick={choose}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{ minHeight: PREVIEW_SIZE }}
          >
            <IconPhotoPlus size={32} stroke={1.4} aria-hidden />
            <Text size="sm" fw={600} mt={4}>
              写真を選ぶ
            </Text>
            <Text size="xs" c="dimmed">
              クリックするか、ここに写真をドラッグ&ドロップ
            </Text>
          </button>
        )}
      </Box>
    </Input.Wrapper>
  )
}
