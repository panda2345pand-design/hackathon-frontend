import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Text,
  Textarea,
} from '@mantine/core'
import { IconBulb, IconSparkles } from '@tabler/icons-react'
import { type FormEvent, useState } from 'react'
import { aiNegotiate, createOffer } from '../api'
import { errorMessage, notifyError } from '../lib/errors'
import { ACCEPTANCE_LABEL, formatPrice, parseYen } from '../lib/format'
import type { ItemDetail, NegotiateResponse, Offer } from '../types'
import { AiSourceBadge } from './AiSourceBadge'

interface NegotiateModalProps {
  item: ItemDetail
  opened: boolean
  onClose: () => void
  onSent: (offer: Offer) => void
}

/**
 * 価格交渉: ① 希望額を入れる → ② AI が「通りやすさ」と丁寧な文面を出す → ③ 文面を直して送る。
 * 通りやすさの判定や文面はサーバー(/ai/negotiate)が作る。
 */
export function NegotiateModal({ item, opened, onClose, onSent }: NegotiateModalProps) {
  const [amountInput, setAmountInput] = useState<number | string>('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [advice, setAdvice] = useState<{ amount: number; result: NegotiateResponse } | null>(null)
  const [message, setMessage] = useState('')
  const [asking, setAsking] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const reset = () => {
    setAmountInput('')
    setAmountError(null)
    setAdvice(null)
    setMessage('')
    setSendError(null)
  }

  const close = () => {
    if (asking || sending) return
    reset()
    onClose()
  }

  const ask = async (event: FormEvent) => {
    event.preventDefault()
    const amount = parseYen(amountInput)
    if (amount === null) {
      setAmountError('希望する金額を 1 円以上の整数で入れてください')
      return
    }
    setAmountError(null)
    setAsking(true)
    try {
      const result = await aiNegotiate(item.id, amount)
      setAdvice({ amount, result })
      setMessage(result.reply)
    } catch (error) {
      notifyError(error, 'AI に相談できませんでした')
    } finally {
      setAsking(false)
    }
  }

  const send = async () => {
    if (!advice) return
    setSending(true)
    setSendError(null)
    try {
      const offer = await createOffer(item.id, {
        amount: advice.amount,
        message: message.trim() || undefined,
      })
      reset()
      onSent(offer)
    } catch (error) {
      setSendError(errorMessage(error))
    } finally {
      setSending(false)
    }
  }

  const acceptance = advice ? ACCEPTANCE_LABEL[advice.result.acceptance] : null

  return (
    <Modal opened={opened} onClose={close} title="価格交渉する" centered size="md">
      <Stack gap="md">
        <Group justify="space-between" gap="xs">
          <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
            {item.title}
          </Text>
          <Text size="sm" className="price">
            出品価格 <b>{formatPrice(item.price)}</b>
          </Text>
        </Group>

        {!advice && (
          <form onSubmit={ask} noValidate>
            <Stack gap="md">
              <NumberInput
                label="希望する金額(円)"
                description="AI が、この金額が通りそうかを見て、丁寧な文面を作ります"
                placeholder="例: 2500"
                value={amountInput}
                onChange={setAmountInput}
                error={amountError}
                min={1}
                allowDecimal={false}
                allowNegative={false}
                thousandSeparator=","
                prefix="¥"
                inputMode="numeric"
                data-autofocus
                required
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={close} disabled={asking}>
                  やめる
                </Button>
                <Button type="submit" loading={asking} leftSection={<IconSparkles size={16} aria-hidden />}>
                  AI に相談する
                </Button>
              </Group>
            </Stack>
          </form>
        )}

        {advice && acceptance && (
          <Stack gap="md">
            <Paper withBorder p="sm" bg="nego.0" style={{ borderColor: 'var(--mantine-color-nego-2)' }}>
              <Group justify="space-between" gap="xs">
                <div>
                  <Text size="xs" c="dimmed">
                    希望額
                  </Text>
                  <Text className="price" fw={700} size="xl">
                    {formatPrice(advice.amount)}
                  </Text>
                </div>
                <Stack gap={4} align="flex-end">
                  <Badge color={acceptance.color} size="lg" aria-label={`通りやすさ:${acceptance.label}`}>
                    {acceptance.label}
                  </Badge>
                  <AiSourceBadge source={advice.result.source} />
                </Stack>
              </Group>
              {advice.result.predicted_price !== null && (
                <Text size="xs" c="dimmed" mt={6} className="price">
                  AI の適正価格の目安:{formatPrice(advice.result.predicted_price)}
                </Text>
              )}
            </Paper>

            <Textarea
              label="出品者に送るメッセージ"
              description="AI の下書きです。自由に直してから送れます"
              value={message}
              onChange={(e) => setMessage(e.currentTarget.value)}
              autosize
              minRows={3}
              maxRows={8}
            />

            {advice.result.seller_tip && (
              <Alert
                variant="light"
                color="gray"
                icon={<IconBulb size={18} aria-hidden />}
                title="出品者側から見ると"
              >
                {advice.result.seller_tip}
              </Alert>
            )}

            {sendError && (
              <Alert color="red" variant="light" role="alert" title="送れませんでした">
                {sendError}
              </Alert>
            )}

            <Group justify="space-between">
              <Button variant="subtle" color="gray" onClick={() => setAdvice(null)} disabled={sending}>
                金額を変える
              </Button>
              <Button onClick={send} loading={sending}>
                この内容で送る
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}
