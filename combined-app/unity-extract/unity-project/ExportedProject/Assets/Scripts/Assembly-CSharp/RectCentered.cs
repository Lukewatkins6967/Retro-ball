using System;
using UnityEngine;

[Serializable]
internal class RectCentered
{
	private Vector2 m_min = -Vector2.one;

	private Vector2 m_max = Vector2.one;

	public Vector2 Center
	{
		get
		{
			return (m_min + m_max) * 0.5f;
		}
		set
		{
			Vector2 vector = value - Center;
			m_min += vector;
			m_max += vector;
		}
	}

	public Vector2 Size
	{
		get
		{
			return m_max - m_min;
		}
		set
		{
			Vector2 vector = (value - (m_max - m_min)) * 0.5f;
			m_min -= vector;
			m_max += vector;
		}
	}

	public float Width
	{
		get
		{
			return m_max.x - m_min.x;
		}
		set
		{
			float num = (value - (m_max.x - m_min.x)) * 0.5f;
			m_min.x -= num;
			m_max.x += num;
		}
	}

	public float Height
	{
		get
		{
			return m_max.y - m_min.y;
		}
		set
		{
			float num = (value - (m_max.y - m_min.y)) * 0.5f;
			m_min.y -= num;
			m_max.y += num;
		}
	}

	public Vector2 Min
	{
		get
		{
			return m_min;
		}
		set
		{
			m_min = value;
		}
	}

	public Vector2 Max
	{
		get
		{
			return m_max;
		}
		set
		{
			m_max = value;
		}
	}

	public float MinX
	{
		get
		{
			return m_min.x;
		}
		set
		{
			m_min.x = value;
		}
	}

	public float MaxX
	{
		get
		{
			return m_max.x;
		}
		set
		{
			m_max.x = value;
		}
	}

	public float MinY
	{
		get
		{
			return m_min.y;
		}
		set
		{
			m_min.y = value;
		}
	}

	public float MaxY
	{
		get
		{
			return m_max.y;
		}
		set
		{
			m_max.y = value;
		}
	}

	public RectCentered()
	{
	}

	public RectCentered(float centerX, float centerY, float width, float height)
	{
		Center = new Vector2(centerX, centerY);
		Size = new Vector2(width, height);
	}

	public RectCentered(Rect rect)
	{
		m_min = rect.min;
		m_max = rect.max;
	}

	public RectCentered(RectCentered rect)
	{
		m_min = rect.Min;
		m_max = rect.Max;
	}

	public void Encapsulate(Vector2 point)
	{
		m_min.x = Mathf.Min(m_min.x, point.x);
		m_min.y = Mathf.Min(m_min.y, point.y);
		m_max.x = Mathf.Max(m_max.x, point.x);
		m_max.y = Mathf.Max(m_max.y, point.y);
	}

	public void Encapsulate(Vector2 point, float radius)
	{
		m_min.x = Mathf.Min(m_min.x, point.x - radius);
		m_min.y = Mathf.Min(m_min.y, point.y - radius);
		m_max.x = Mathf.Max(m_max.x, point.x + radius);
		m_max.y = Mathf.Max(m_max.y, point.y + radius);
	}

	public void Encapsulate(RectCentered rect)
	{
		m_min.x = Mathf.Min(m_min.x, rect.Min.x);
		m_min.y = Mathf.Min(m_min.y, rect.Min.y);
		m_max.x = Mathf.Max(m_max.x, rect.Max.x);
		m_max.y = Mathf.Max(m_max.y, rect.Max.y);
	}
}
