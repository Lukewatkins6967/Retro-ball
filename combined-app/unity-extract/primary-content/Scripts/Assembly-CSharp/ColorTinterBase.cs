using System;
using System.Collections.Generic;
using UnityEngine;

public class ColorTinterBase : MonoBehaviour
{
	[Serializable]
	public class FlashTintData
	{
		public Color m_colour;

		public float m_rate;

		public float m_duration;

		public override string ToString()
		{
			return m_colour.ToString();
		}
	}

	protected static readonly Color COLOR_NOALPHA = new Color(1f, 1f, 1f, 0f);

	private static readonly string STR_SHADER_TINT = "_SeaTint";

	[SerializeField]
	private FlashTintData[] m_flashTintData;

	private TimedList<Color> m_tints = new TimedList<Color>();

	private FlashTintData m_currFlashData;

	private float m_currFlashDuration;

	private float m_currFlashTimer;

	private Color m_currTint = COLOR_NOALPHA;

	private Material m_materialCached;

	private bool m_hasProperty;

	public virtual void ReapplyTint()
	{
		m_materialCached = null;
		m_hasProperty = false;
		UpdateTint(true);
	}

	public virtual void Clear()
	{
		m_tints.Clear();
		m_currFlashData = null;
		m_currFlashDuration = 0f;
		m_currFlashTimer = 0f;
		m_currTint = COLOR_NOALPHA;
		UpdateTint(true);
	}

	public void AnimFlash(int dataIndex)
	{
		if (m_flashTintData.IsIndexValid(dataIndex))
		{
			StartFlash(m_flashTintData[dataIndex]);
		}
	}

	public void StartFlash(FlashTintData data)
	{
		if (m_currFlashData != null)
		{
			if (m_currFlashData == data)
			{
				m_currFlashDuration = m_currFlashData.m_duration;
			}
		}
		else
		{
			m_currFlashData = data;
			m_currFlashDuration = 0f;
			m_currFlashTimer = 0f;
			AddTint(m_currFlashData.m_colour, m_currFlashData.m_rate * 0.5f);
		}
	}

	public void AddTint(Color color, float time)
	{
		m_tints.Add(color, time);
		UpdateTint(true);
	}

	public void AddTint(Color color)
	{
		m_tints.Add(color);
		UpdateTint(true);
	}

	public void RemoveTint(Color color)
	{
		if (m_tints.Remove(color) && m_hasProperty)
		{
			if (m_tints.Empty())
			{
				m_materialCached.SetColor(STR_SHADER_TINT, COLOR_NOALPHA);
			}
			else if (color == m_currTint)
			{
				UpdateTint(false);
			}
		}
	}

	public void OnSpriteColorChange()
	{
		UpdateTint(false);
	}

	private void Start()
	{
		OnSpawn();
	}

	private void Recycle(GameObject prefab)
	{
		m_tints.Clear();
		m_currFlashData = null;
		m_currFlashDuration = 0f;
		m_currFlashTimer = 0f;
		m_currTint = COLOR_NOALPHA;
		UpdateTint(false);
	}

	protected virtual void OnSpawn()
	{
	}

	private void Update()
	{
		if (m_currFlashData != null)
		{
			m_currFlashDuration += Time.deltaTime;
			if (m_currFlashDuration > m_currFlashData.m_duration)
			{
				RemoveTint(m_currFlashData.m_colour);
				m_currFlashData = null;
			}
			else
			{
				float currFlashTimer = m_currFlashTimer;
				m_currFlashTimer += Time.deltaTime;
				if (currFlashTimer < m_currFlashData.m_rate && m_currFlashTimer >= m_currFlashData.m_rate)
				{
					m_currFlashTimer -= m_currFlashData.m_rate;
					AddTint(m_currFlashData.m_colour, m_currFlashData.m_rate * 0.5f);
				}
			}
		}
		if (m_tints.UpdateReturnModified())
		{
			UpdateTint(false);
		}
	}

	protected void UpdateTint(bool force)
	{
		if (!CheckMaterialProperty())
		{
			return;
		}
		if (m_tints.Empty() && m_currTint != COLOR_NOALPHA)
		{
			m_materialCached.SetColor(STR_SHADER_TINT, COLOR_NOALPHA);
			m_currTint = COLOR_NOALPHA;
		}
		if (m_tints.Contains(m_currTint) && !force)
		{
			return;
		}
		float num = float.MaxValue;
		Color color = COLOR_NOALPHA;
		List<TimedList<Color>.TimedListItem> list = new List<TimedList<Color>.TimedListItem>(m_tints.GetList());
		foreach (TimedList<Color>.TimedListItem item in list)
		{
			float timeRemaining = item.m_TimeRemaining;
			if ((force || timeRemaining <= 0f || timeRemaining > 0.5f) && ((timeRemaining > 0f && timeRemaining < num) || num == float.MaxValue))
			{
				if (timeRemaining > 0f)
				{
					num = timeRemaining;
				}
				color = item.m_Source;
			}
		}
		m_materialCached.SetColor(STR_SHADER_TINT, color);
		m_currTint = color;
	}

	protected bool CheckMaterialProperty()
	{
		if (!m_hasProperty && base.enabled && (bool)GetComponent<Renderer>() && (bool)GetComponent<Renderer>().material && m_materialCached != GetComponent<Renderer>().material)
		{
			m_materialCached = GetComponent<Renderer>().material;
			m_hasProperty = m_materialCached.HasProperty(STR_SHADER_TINT);
		}
		return m_hasProperty;
	}

	private void AnimAtlasChanged()
	{
		ReapplyTint();
	}
}
