using UnityEngine;

public class Deactivator : MonoBehaviour
{
	private float m_timer;

	public void Show(float duration)
	{
		m_timer = duration;
		base.gameObject.SetActive(true);
	}

	private void Update()
	{
		m_timer -= Time.deltaTime;
		if (m_timer <= 0f)
		{
			base.gameObject.SetActive(false);
		}
	}
}
