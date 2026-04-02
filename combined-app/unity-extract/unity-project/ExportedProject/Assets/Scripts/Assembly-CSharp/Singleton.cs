using UnityEngine;

public class Singleton<T> : MonoBehaviour where T : MonoBehaviour
{
	protected static T m_instance;

	public static T Get
	{
		get
		{
			return m_instance;
		}
	}

	protected void SetSingleton()
	{
		if (m_instance == null)
		{
			m_instance = base.gameObject.GetComponent<T>();
		}
	}

	protected void SetSingleton(T instance)
	{
		m_instance = instance;
	}

	public static bool GetValid()
	{
		return m_instance != null;
	}
}
