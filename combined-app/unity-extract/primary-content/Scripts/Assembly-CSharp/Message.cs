using System;
using UnityEngine;

[Serializable]
public class Message
{
	public string m_message = string.Empty;

	public MsgParams m_params;

	public void SendTo(GameObject toObject)
	{
		toObject.SendMessage(m_message, m_params, SendMessageOptions.DontRequireReceiver);
	}

	public void SendUpwardsTo(GameObject toObject)
	{
		toObject.SendMessageUpwards(m_message, m_params, SendMessageOptions.DontRequireReceiver);
	}
}
