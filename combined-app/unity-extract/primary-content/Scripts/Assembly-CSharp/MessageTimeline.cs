using System.Collections.Generic;
using UnityEngine;

public class MessageTimeline<T>
{
	private class Message
	{
		public T m_data;

		public float m_time;

		public DelegateMsg m_callback;
	}

	public delegate void DelegateMsg(T data);

	private List<Message> m_messages = new List<Message>();

	public void Add(T data, float delay, DelegateMsg callback)
	{
		m_messages.Insert(0, new Message
		{
			m_data = data,
			m_callback = callback,
			m_time = Time.timeSinceLevelLoad + delay
		});
	}

	public void Update()
	{
		for (int num = m_messages.Count - 1; num >= 0; num--)
		{
			Message message = m_messages[num];
			if (Time.timeSinceLevelLoad >= message.m_time)
			{
				message.m_callback(message.m_data);
				m_messages.RemoveAt(num);
			}
		}
	}
}
