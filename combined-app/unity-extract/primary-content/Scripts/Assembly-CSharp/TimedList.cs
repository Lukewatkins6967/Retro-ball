using System.Collections.Generic;
using UnityEngine;

public class TimedList<T>
{
	public class TimedListItem
	{
		public T m_Source;

		public float m_TimeRemaining;

		public TimedListItem(T source, float t)
		{
			m_Source = source;
			m_TimeRemaining = t;
		}
	}

	private List<TimedListItem> m_list = new List<TimedListItem>();

	public void Add(T source)
	{
		TimedListItem timedListItem = m_list.Find((TimedListItem x) => EqualityComparer<T>.Default.Equals(x.m_Source, source));
		if (timedListItem != null)
		{
			timedListItem.m_TimeRemaining = 0f;
		}
		else
		{
			m_list.Add(new TimedListItem(source, 0f));
		}
	}

	public void Add(T source, float time)
	{
		TimedListItem timedListItem = m_list.Find((TimedListItem x) => EqualityComparer<T>.Default.Equals(x.m_Source, source));
		if (timedListItem != null)
		{
			timedListItem.m_TimeRemaining = time;
		}
		else
		{
			m_list.Add(new TimedListItem(source, time));
		}
	}

	public void AddAdditive(T source, float time)
	{
		TimedListItem timedListItem = m_list.Find((TimedListItem x) => EqualityComparer<T>.Default.Equals(x.m_Source, source));
		if (timedListItem != null)
		{
			timedListItem.m_TimeRemaining += time;
		}
		else
		{
			m_list.Add(new TimedListItem(source, time));
		}
	}

	public bool Remove(T source)
	{
		if (m_list.RemoveAll((TimedListItem x) => EqualityComparer<T>.Default.Equals(x.m_Source, source)) > 0)
		{
			return true;
		}
		return false;
	}

	public bool Empty()
	{
		return m_list.Count == 0;
	}

	public void Clear()
	{
		m_list.Clear();
	}

	public int Count()
	{
		return m_list.Count;
	}

	public bool Contains(T source)
	{
		return m_list.Find((TimedListItem x) => EqualityComparer<T>.Default.Equals(x.m_Source, source)) != null;
	}

	public List<TimedListItem> GetList()
	{
		return m_list;
	}

	public float GetTimeRemaining(T source)
	{
		float result = 0f;
		TimedListItem timedListItem = m_list.Find((TimedListItem x) => EqualityComparer<T>.Default.Equals(x.m_Source, source));
		if (timedListItem != null)
		{
			result = timedListItem.m_TimeRemaining;
		}
		return result;
	}

	public bool Update()
	{
		for (int num = m_list.Count - 1; num >= 0; num--)
		{
			TimedListItem timedListItem = m_list[num];
			float timeRemaining = timedListItem.m_TimeRemaining;
			if (timeRemaining > 0f)
			{
				timeRemaining -= Time.smoothDeltaTime;
				if (timeRemaining <= 0f)
				{
					m_list.RemoveAt(num);
				}
				else
				{
					timedListItem.m_TimeRemaining = timeRemaining;
				}
			}
		}
		return m_list.Count > 0;
	}

	public bool UpdateReturnModified()
	{
		int count = m_list.Count;
		Update();
		return m_list.Count != count;
	}

	public bool Update(out List<T> removed)
	{
		removed = null;
		for (int num = m_list.Count - 1; num >= 0; num--)
		{
			TimedListItem timedListItem = m_list[num];
			float timeRemaining = timedListItem.m_TimeRemaining;
			if (timeRemaining > 0f)
			{
				timeRemaining -= Time.deltaTime;
				if (timeRemaining <= 0f)
				{
					if (removed == null)
					{
						removed = new List<T>();
					}
					removed.Add(timedListItem.m_Source);
					m_list.RemoveAt(num);
				}
				else
				{
					timedListItem.m_TimeRemaining = timeRemaining;
				}
			}
		}
		return m_list.Count > 0;
	}
}
