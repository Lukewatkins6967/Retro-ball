using UnityEngine;

public class BillboardSprite : MonoBehaviour
{
	private enum Mode
	{
		Normal = 0,
		Upright = 1
	}

	[SerializeField]
	private Mode m_mode;

	private void Update()
	{
		Vector3 forward = Camera.main.transform.forward;
		if (m_mode == Mode.Upright)
		{
			forward.y = 0f;
			forward.Normalize();
		}
		base.transform.forward = forward;
	}
}
