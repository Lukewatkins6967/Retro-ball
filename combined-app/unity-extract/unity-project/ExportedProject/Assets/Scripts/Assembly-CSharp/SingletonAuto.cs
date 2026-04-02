using UnityEngine;

public class SingletonAuto<T> : MonoBehaviour where T : MonoBehaviour
{
	protected static T m_instance;

	public static T Get
	{
		get
		{
			if (m_instance == null)
			{
				m_instance = (T)Object.FindObjectOfType(typeof(T));
				if (m_instance == null)
				{
					GameObject gameObject = new GameObject();
					gameObject.name = typeof(T).ToString();
					m_instance = (T)gameObject.AddComponent(typeof(T));
				}
			}
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

	public static bool GetValid()
	{
		return m_instance != null;
	}
}
