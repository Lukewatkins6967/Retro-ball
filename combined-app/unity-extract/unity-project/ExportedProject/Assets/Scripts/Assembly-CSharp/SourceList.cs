using System.Collections.Generic;

public class SourceList
{
	private Dictionary<string, int> m_list = new Dictionary<string, int>();

	public int Add(string source)
	{
		int num = ((!m_list.TryGetValue(source, out num)) ? 1 : (num + 1));
		m_list[source] = num;
		return num;
	}

	public void Remove(string source)
	{
		int value;
		if (m_list.TryGetValue(source, out value))
		{
			value--;
			if (value == 0)
			{
				m_list.Remove(source);
			}
			else
			{
				m_list[source] = value;
			}
		}
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

	public int Count(string source)
	{
		int value = 0;
		if (m_list.TryGetValue(source, out value))
		{
			value++;
			m_list[source] = value;
		}
		return value;
	}

	public bool Contains(string source)
	{
		return m_list.ContainsKey(source);
	}
}
