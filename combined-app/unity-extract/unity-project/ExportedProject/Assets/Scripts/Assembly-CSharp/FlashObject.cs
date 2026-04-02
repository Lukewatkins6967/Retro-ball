using UnityEngine;

public class FlashObject : MonoBehaviour
{
	[SerializeField]
	private bool m_defaultFlashing;

	[SerializeField]
	private Transform[] m_onObjects;

	[SerializeField]
	private Transform[] m_offObjects;

	[SerializeField]
	private float m_onTime = 0.1f;

	[SerializeField]
	private float m_offTime = 0.1f;

	private bool m_flashing;

	private float m_flashTime;

	public void SetFlashing(bool flash)
	{
		m_flashing = flash;
		if (flash)
		{
			m_flashTime = 0f;
			return;
		}
		Transform[] onObjects = m_onObjects;
		foreach (Transform transform in onObjects)
		{
			transform.gameObject.SetActive(true);
		}
		Transform[] offObjects = m_offObjects;
		foreach (Transform transform2 in offObjects)
		{
			transform2.gameObject.SetActive(false);
		}
	}

	private void Awake()
	{
		SetFlashing(m_defaultFlashing);
	}

	private void Update()
	{
		if (m_flashing)
		{
			m_flashTime += Time.deltaTime;
			bool flag = m_flashTime % (m_onTime + m_offTime) < m_onTime;
			Transform[] onObjects = m_onObjects;
			foreach (Transform transform in onObjects)
			{
				transform.gameObject.SetActive(flag);
			}
			Transform[] offObjects = m_offObjects;
			foreach (Transform transform2 in offObjects)
			{
				transform2.gameObject.SetActive(!flag);
			}
		}
	}
}
