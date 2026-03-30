import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: '請上傳圖片' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '只接受圖片檔案（jpg, png, webp）' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '圖片大小不能超過 10MB' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key 未設定' }, { status: 500 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    const prompt = `This is a screenshot of a property listing in Taiwan. Extract the following information if visible. Return JSON only, no explanation:
{
  "address": "full address if visible",
  "district": "district name (e.g. 大安, 信義, 中山)",
  "rent": monthly rent as number,
  "size_ping": size in 坪 as number,
  "unit_floor": floor number,
  "total_floors": total floors,
  "room_layout": "e.g. 3房2廳1衛",
  "building_type": "apartment_4to6 or townhouse or building or other",
  "building_age": age in years if mentioned,
  "contact_name": "landlord or agent name if visible",
  "contact_phone": "phone number if visible",
  "current_condition": "empty or occupied or rented or abandoned if determinable",
  "notes": "any other relevant details about the property"
}
Only include fields where you can find data. Use null for fields not found.`

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('OpenAI API error:', errText)
      return NextResponse.json({ error: '圖片分析失敗，請稍後再試' }, { status: 200 })
    }

    const openaiData = await openaiRes.json()
    const content = openaiData.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: '無法辨識截圖內容，請手動輸入' }, { status: 200 })
    }

    // Parse JSON from response
    let extracted: Record<string, unknown> = {}
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```(?:json)?/g, '').replace(/```/g, '').trim()
      extracted = JSON.parse(cleaned)
    } catch {
      console.error('JSON parse error, raw content:', content)
      return NextResponse.json({ error: '無法辨識截圖內容，請手動輸入' }, { status: 200 })
    }

    // Remove null values and normalize field names to match CRM schema
    const result: Record<string, unknown> = {}

    if (extracted.address && extracted.address !== null) result.address = extracted.address
    if (extracted.district && extracted.district !== null) result.district = String(extracted.district).replace(/區$/, '') + '區'
    if (extracted.rent && extracted.rent !== null) result.monthly_rent = Number(extracted.rent)
    if (extracted.size_ping && extracted.size_ping !== null) result.size_ping = Number(extracted.size_ping)
    if (extracted.unit_floor && extracted.unit_floor !== null) result.unit_floor = Number(extracted.unit_floor)
    if (extracted.total_floors && extracted.total_floors !== null) result.total_floors = Number(extracted.total_floors)
    if (extracted.room_layout && extracted.room_layout !== null) result.room_layout = extracted.room_layout
    if (extracted.building_type && extracted.building_type !== null) result.building_type = extracted.building_type
    if (extracted.building_age && extracted.building_age !== null) result.building_age = Number(extracted.building_age)
    if (extracted.contact_name && extracted.contact_name !== null) result.contact_name = extracted.contact_name
    if (extracted.contact_phone && extracted.contact_phone !== null) result.contact_phone = extracted.contact_phone
    if (extracted.current_condition && extracted.current_condition !== null) result.current_condition = extracted.current_condition
    if (extracted.notes && extracted.notes !== null) result.notes = extracted.notes

    const fieldCount = Object.keys(result).length

    if (fieldCount === 0) {
      return NextResponse.json({ error: '無法辨識截圖內容，請手動輸入' }, { status: 200 })
    }

    return NextResponse.json({ ...result, fieldCount })
  } catch (err: unknown) {
    console.error('extract-screenshot error:', err)
    return NextResponse.json({ error: '擷取失敗，請手動輸入' }, { status: 200 })
  }
}
