using UnityEngine;

public class Shake : MonoBehaviour
{
	[SerializeField]
	private bool m_transformSelf;

	[SerializeField]
	private bool m_alwaysShake;

	[SerializeField]
	private float m_intensity = 1f;

	private float m_duration;

	private float m_timer;

	private Vector3 m_startLocalPosition;

	private Vector3 m_offset;

	public void StartShake(float intensity, float duration)
	{
		m_intensity = intensity;
		m_timer = (m_duration = duration);
	}

	public Vector3 GetOffset()
	{
		return m_offset;
	}

	private void Awake()
	{
		if (m_transformSelf)
		{
			m_startLocalPosition = base.transform.localPosition;
		}
	}

	private void Update()
	{
		m_offset = Vector3.zero;
		bool flag = m_alwaysShake;
		if (m_timer > 0f)
		{
			m_timer -= Time.deltaTime;
			flag = true;
		}
		if (flag)
		{
			Vector3 onUnitSphere = Random.onUnitSphere;
			float num = m_intensity;
			if (m_timer > 0f)
			{
				num = Mathf.Lerp(0f, m_intensity, m_timer / m_duration);
			}
			m_offset = onUnitSphere.normalized * num;
		}
		if (m_transformSelf)
		{
			if (flag)
			{
				base.transform.localPosition = m_startLocalPosition + m_offset;
			}
			else
			{
				base.transform.localPosition = m_startLocalPosition;
			}
		}
	}
}
